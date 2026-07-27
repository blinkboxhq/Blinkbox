import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import User from "../../models/user.model.js";
import { getNodeCost, addPurchasedCredits } from "../../infra/credit.engine.js";
import {
  sendProWelcomeEmail,
  sendProEndingSoonEmail,
  sendProEndedEmail,
  sendInvoiceEmail,
  sendPaymentFailedEmail,
  sendRenewalReminderEmail,
  sendTopUpReceiptEmail,
} from "../../infra/email.service.js";
import {
  PLANS,
  CREDIT_PACKS,
  PAYG_CREDITS_PER_USD,
  PAYG_MIN_USD,
  PAYG_MAX_USD,
  getPack,
  packSavingPercent,
  creditsForUsd,
  usdForCredits,
  normalizePaygUsd,
  normalizeAutoRecharge,
  AUTO_RECHARGE_MIN_THRESHOLD,
  AUTO_RECHARGE_MAX_THRESHOLD,
  AUTO_RECHARGE_DEFAULT_CAP_USD,
  AUTO_RECHARGE_MAX_CAP_USD,
} from "./credit.plans.js";
import { stripe } from "./stripe.client.js";
import { STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO, FRONTEND_URL } from "../../config/env.js";

// Starting a second subscription while one of these is open bills the card
// twice a month. "incomplete" is deliberately absent: it never charges and
// expires on its own, so blocking on it would trap a retry after a declined card.
const LIVE_SUB_STATUSES = new Set(["active", "trialing"]);
const AILING_SUB_STATUSES = new Set(["past_due", "unpaid"]);

function nextCycleStart(usage) {
  if (usage.billingCycleEnd) return usage.billingCycleEnd;
  const from = new Date(usage.billingCycleStart);
  return new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

export async function getUsage(req, res) {
  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);
    const planRemaining = Math.max(0, usage.monthlyLimit - usage.creditsUsed);
    const purchasedCredits = usage.purchasedCredits || 0;

    const balance = planRemaining + purchasedCredits;
    const auto = usage.autoRecharge || {};

    res.json({
      plan: usage.plan,
      creditsUsed: usage.creditsUsed,
      monthlyLimit: usage.monthlyLimit,
      planRemaining,
      purchasedCredits,
      purchasedSpent: usage.purchasedSpent || 0,
      balance,
      remaining: balance,
      creditsPerUsd: PAYG_CREDITS_PER_USD,
      balanceUsd: usdForCredits(balance),
      planRemainingUsd: usdForCredits(planRemaining),
      purchasedCreditsUsd: usdForCredits(purchasedCredits),
      autoRecharge: {
        enabled: Boolean(auto.enabled),
        thresholdCredits: auto.thresholdCredits || 0,
        amountUsd: auto.amountUsd || 0,
        monthlyCapUsd: auto.monthlyCapUsd || AUTO_RECHARGE_DEFAULT_CAP_USD,
        spentThisCycleUsd: auto.spentThisCycleUsd || 0,
        hasCard: Boolean(auto.paymentMethodId),
        cardBrand: auto.cardBrand || null,
        cardLast4: auto.cardLast4 || null,
        lastChargeAt: auto.lastChargeAt || null,
        lastFailure: auto.lastFailure || null,
      },
      // Measured against everything spendable, not just the plan bucket. On the
      // allowance alone the meter reads 100% full to someone sitting on $50 of
      // purchased credits, right above the line that says $50 left.
      percentUsed: usage.monthlyLimit + purchasedCredits > 0
        ? Math.min(100, Math.round((usage.creditsUsed / (usage.monthlyLimit + purchasedCredits)) * 100))
        : 100,
      billingCycleStart: usage.billingCycleStart,
      billingCycleEnd: nextCycleStart(usage),
      purchases: (usage.purchases || []).slice(-10).reverse(),
      costTable: { standard: 1, http_request: 5, ai_agent: 10, web_scraper: 15 },
    });
  } catch (err) {
    console.error("[Billing] getUsage error:", err.message);
    res.status(500).json({ message: "Failed to fetch usage data." });
  }
}

export async function getCatalog(_req, res) {
  res.json({
    plans: Object.values(PLANS),
    packs: CREDIT_PACKS.map((pack) => ({ ...pack, savingPercent: packSavingPercent(pack) })),
    payg: {
      creditsPerUsd: PAYG_CREDITS_PER_USD,
      minUsd: PAYG_MIN_USD,
      maxUsd: PAYG_MAX_USD,
    },
    autoRecharge: {
      minThreshold: AUTO_RECHARGE_MIN_THRESHOLD,
      maxThreshold: AUTO_RECHARGE_MAX_THRESHOLD,
      defaultCapUsd: AUTO_RECHARGE_DEFAULT_CAP_USD,
      maxCapUsd: AUTO_RECHARGE_MAX_CAP_USD,
    },
    stripeReady: Boolean(stripe),
  });
}

/**
 * Turn auto-recharge on or off. Enabling needs a card already on file, which
 * a manual top-up saves — we never ask for card details ourselves.
 */
export async function updateAutoRecharge(req, res) {
  const { error, value } = normalizeAutoRecharge(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);

    if (value.enabled && !usage.autoRecharge?.paymentMethodId) {
      return res.status(400).json({
        message: "Buy credits once first — that saves the card auto-recharge will use.",
      });
    }

    const set = value.enabled
      ? {
          "autoRecharge.enabled": true,
          "autoRecharge.thresholdCredits": value.thresholdCredits,
          "autoRecharge.amountUsd": value.amountUsd,
          "autoRecharge.monthlyCapUsd": value.monthlyCapUsd,
          // A fresh set of settings clears the strikes from an old dead card.
          "autoRecharge.failureCount": 0,
          "autoRecharge.lastFailure": null,
        }
      : { "autoRecharge.enabled": false };

    const updated = await WorkspaceUsage.findOneAndUpdate(
      { workspaceId: req.user.id },
      { $set: set },
      { returnDocument: "after" },
    );

    // Someone who switches this on while already empty is the whole reason the
    // feature exists — waiting for a deduction that can never happen would
    // leave them stuck with auto top-up on and nothing topping up.
    if (value.enabled) {
      import("./auto.recharge.js")
        .then((m) => m.maybeAutoRecharge(req.user.id))
        .catch((err) => console.error("[Billing] auto top-up on enable failed:", err.message));
    }

    res.json({ autoRecharge: { ...updated.autoRecharge.toObject(), paymentMethodId: undefined } });
  } catch (err) {
    console.error("[Billing] updateAutoRecharge error:", err.message);
    res.status(500).json({ message: "Failed to save auto-recharge settings." });
  }
}

export async function getHistory(req, res) {
  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);
    res.json({ history: usage.history || [], totalEntries: (usage.history || []).length });
  } catch (err) {
    console.error("[Billing] getHistory error:", err.message);
    res.status(500).json({ message: "Failed to fetch usage history." });
  }
}

export async function createCheckoutSession(req, res) {
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }
  if (!STRIPE_PRICE_ID_PRO) {
    return res.status(503).json({ message: "Pro price ID not configured." });
  }

  try {
    const user = await User.findById(req.user.id);
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    } else {
      // A stale tab still showing "Go Pro" would otherwise open a second
      // subscription on the same card and bill $19 twice every month.
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      if (subs.data.some((s) => LIVE_SUB_STATUSES.has(s.status))) {
        return res.status(409).json({ message: "You are already on Pro. Manage it from the billing portal." });
      }
      if (subs.data.some((s) => AILING_SUB_STATUSES.has(s.status))) {
        return res.status(409).json({
          message: "Your Pro payment did not go through. Update your card in the billing portal to restart it.",
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID_PRO, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?tab=usage&upgrade=success`,
      cancel_url: `${FRONTEND_URL}/dashboard?tab=usage&upgrade=cancelled`,
      metadata: { userId: user._id.toString() },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[Billing] createCheckoutSession error:", err.message);
    res.status(500).json({ message: "Failed to create checkout session." });
  }
}

/**
 * Pay-as-you-go: a one-time charge for any dollar amount in range. Priced
 * inline so the rate can be re-tuned in credit.plans.js without minting
 * Stripe price IDs. `packId` is still accepted for older clients.
 */
export async function createCreditCheckout(req, res) {
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }

  const pack = req.body?.packId ? getPack(req.body.packId) : null;
  const amountUsd = pack ? pack.priceUsd : normalizePaygUsd(req.body?.amountUsd);
  if (!amountUsd) {
    return res.status(400).json({
      message: `Choose an amount between $${PAYG_MIN_USD} and $${PAYG_MAX_USD}.`,
    });
  }
  const credits = pack ? pack.credits : creditsForUsd(amountUsd);

  try {
    const user = await User.findById(req.user.id);
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountUsd * 100,
            product_data: {
              name: `${credits.toLocaleString()} Blinkbox credits`,
              description: "Credits never expire and roll over month to month.",
            },
          },
        },
      ],
      // Keeps the card on file so auto-recharge has something to charge later.
      payment_intent_data: { setup_future_usage: "off_session" },
      success_url: `${FRONTEND_URL}/dashboard?tab=usage&purchase=success`,
      cancel_url: `${FRONTEND_URL}/dashboard?tab=buy-credits&purchase=cancelled`,
      metadata: {
        userId: user._id.toString(),
        kind: "credits",
        ...(pack ? { packId: pack.id } : {}),
        credits: String(credits),
        amountUsd: String(amountUsd),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[Billing] createCreditCheckout error:", err.message);
    res.status(500).json({ message: "Failed to start credit purchase." });
  }
}

export async function createPortalSession(req, res) {
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "No active subscription found." });
    }

    // Opening the portal is a read — invoices, cards, and cancellation are all
    // the customer's to drive from inside it. Cancelling or invoicing on their
    // behalf here would charge people for clicking "Manage plan".
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[Billing] createPortalSession error:", err.message);
    res.status(500).json({ message: "Failed to open billing portal." });
  }
}

/**
 * Store the card a completed purchase left behind, so auto-recharge has a
 * payment method to use. Best-effort — a purchase must never fail over this.
 */
async function rememberCard(workspaceId, paymentIntentId) {
  if (!paymentIntentId) return;
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
    const pm = intent.payment_method;
    if (!pm?.id) return;

    await WorkspaceUsage.updateOne(
      { workspaceId },
      {
        $set: {
          "autoRecharge.paymentMethodId": pm.id,
          "autoRecharge.cardBrand": pm.card?.brand || null,
          "autoRecharge.cardLast4": pm.card?.last4 || null,
        },
      },
    );
  } catch (err) {
    console.warn(`[Billing] could not save card for ${workspaceId}: ${err.message}`);
  }
}

// Stripe keeps a subscription billable through dunning; none of these states
// should still be spending Pro credits.
const DEAD_SUB_STATUSES = new Set(["past_due", "unpaid", "canceled", "incomplete_expired"]);

/**
 * Start a paid cycle and pin it to Stripe's period, so the plan bucket refills
 * on the renewal date rather than on the 1st of the calendar month.
 */
async function startProCycle(workspaceId, sub) {
  const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : new Date();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  // invoice.paid and invoice.payment_succeeded both fire for one renewal, and
  // Stripe replays on any non-2xx — refilling twice would wipe real usage.
  const current = await WorkspaceUsage.findOne({ workspaceId });
  if (current?.plan === "pro" && current.billingCycleStart?.getTime() === periodStart.getTime()) {
    return;
  }

  await WorkspaceUsage.findOneAndUpdate(
    { workspaceId },
    {
      $set: {
        plan: "pro",
        monthlyLimit: WorkspaceUsage.PLAN_LIMITS.pro,
        creditsUsed: 0,
        billingCycleStart: periodStart,
        billingCycleEnd: periodEnd,
        "autoRecharge.spentThisCycleUsd": 0,
      },
    },
    { upsert: true },
  );
}

/**
 * Drop back to the free allowance. Purchased credits stay — they were paid for
 * separately and never expire. Anything already spent this month counts against
 * the free bucket so a cancellation can't hand out a free Pro month.
 */
async function downgradeToFree(workspaceId) {
  const freeLimit = WorkspaceUsage.PLAN_LIMITS.free;
  const usage = await WorkspaceUsage.findOne({ workspaceId });
  if (usage?.plan === "free" && !usage.billingCycleEnd) return;

  const now = new Date();
  await WorkspaceUsage.findOneAndUpdate(
    { workspaceId },
    {
      $set: {
        plan: "free",
        monthlyLimit: freeLimit,
        creditsUsed: Math.min(usage?.creditsUsed ?? 0, freeLimit),
        billingCycleStart: new Date(now.getFullYear(), now.getMonth(), 1),
        billingCycleEnd: null,
      },
    },
    { upsert: true },
  );
}

export async function handleWebhook(req, res) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Stripe webhook not configured." });
  }

  const payload = req.rawBody || req.body;

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature failed: ${err.message}` });
  }

  try {
    // ── Credit pack purchased (one-time payment) ────────────────────────────
    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      event.data.object.metadata?.kind === "credits"
    ) {
      const session = event.data.object;
      const userId  = session.metadata.userId;
      const credits = Number(session.metadata.credits);

      // Completed is not the same as paid. Anything settling asynchronously
      // completes first and pays later, and handing over credits on that signal
      // gives them away for free if the payment then fails.
      if (session.payment_status !== "paid") {
        console.warn(`[Billing] credit session ${session.id} not paid yet (${session.payment_status})`);
        return res.json({ received: true });
      }

      if (userId && Number.isFinite(credits) && credits > 0) {
        const amountUsd = Number(session.metadata.amountUsd) || 0;
        const { credited, purchasedCredits } = await addPurchasedCredits(userId, {
          sessionId: session.id,
          packId: session.metadata.packId || null,
          credits,
          amountUsd,
        });
        console.log(
          `[Billing] credit top-up for ${userId}: ${credited ? "applied" : "replay ignored"}`,
        );
        await rememberCard(userId, session.payment_intent);

        // Only on the first application — a Stripe replay must not re-send the
        // receipt for a purchase the user already has one for.
        if (credited) {
          const buyer = await User.findById(userId);
          if (buyer) {
            sendTopUpReceiptEmail(buyer, {
              credits,
              amountUsd,
              purchasedBalance: purchasedCredits,
              receiptId: session.id,
            }).catch((e) => console.error("[Billing] top-up receipt failed:", e.message));
          }
        }
      }
      return res.json({ received: true });
    }

    // ── New subscription ─────────────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      // Match on the mode, not on "everything that wasn't tagged credits" — a
      // one-off top-up that arrived without its tag would otherwise buy Pro.
      if (!userId || session.mode !== "subscription") return res.json({ received: true });

      const user = await User.findByIdAndUpdate(
        userId,
        { stripeSubscriptionId: session.subscription },
        { new: true },
      );

      const sub = session.subscription
        ? await stripe.subscriptions.retrieve(session.subscription)
        : {};
      await startProCycle(userId, sub);

      // Welcome email
      if (user) {
        sendProWelcomeEmail(user, {
          renewsOn: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        }).catch(e =>
          console.error("[Billing] welcome email failed:", e.message)
        );
      }
    }

    // ── Renewal paid — refill the plan bucket for the new period ────────────
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.subscription && invoice.billing_reason !== "subscription_create") {
        const user = await User.findOne({ stripeCustomerId: invoice.customer });
        if (user) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await User.findByIdAndUpdate(user._id, { stripeSubscriptionId: sub.id });
          await startProCycle(user._id.toString(), sub);
          console.log(`[Billing] Pro renewed for ${user._id} — credits refilled`);

          // Both events fire for a single renewal. Pick one to carry the
          // receipt, or every renewal mails two identical ones.
          if (event.type === "invoice.paid") {
            const line = invoice.lines?.data?.[0];
            sendInvoiceEmail(user, {
              invoiceNumber: invoice.number,
              amountUsd: (invoice.amount_paid ?? 0) / 100,
              paidAt: invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000)
                : new Date(),
              periodStart: line?.period?.start ? new Date(line.period.start * 1000) : null,
              periodEnd: line?.period?.end ? new Date(line.period.end * 1000) : null,
              invoiceUrl: invoice.hosted_invoice_url || null,
            }).catch(e => console.error("[Billing] invoice email failed:", e.message));
          }
        }
      }
    }

    // ── Renewal is a few days out — tell them before the card is charged ────
    if (event.type === "invoice.upcoming") {
      const invoice = event.data.object;
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user && invoice.subscription) {
        sendRenewalReminderEmail(user, {
          renewsOn: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : invoice.period_end
              ? new Date(invoice.period_end * 1000)
              : null,
          amountUsd: (invoice.amount_due ?? 0) / 100,
        }).catch(e => console.error("[Billing] renewal reminder failed:", e.message));
      }
    }

    // ── Renewal declined — Stripe keeps retrying, the user has to act ───────
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user && invoice.subscription) {
        sendPaymentFailedEmail(user, {
          amountUsd: (invoice.amount_due ?? 0) / 100,
          attemptCount: invoice.attempt_count || null,
          nextAttempt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : null,
          updateUrl: invoice.hosted_invoice_url || null,
        }).catch(e => console.error("[Billing] payment-failed email failed:", e.message));
      }
    }

    // ── Subscription updated (cancellation flagged, or payment lapsed) ───────
    if (event.type === "customer.subscription.updated") {
      const sub  = event.data.object;
      const prev = event.data.previous_attributes || {};
      const user = await User.findOne({ stripeCustomerId: sub.customer });

      // Only act when cancel_at_period_end just became true (user just cancelled)
      if (user && sub.cancel_at_period_end && prev.cancel_at_period_end === false) {
        const periodEnd = new Date(sub.current_period_end * 1000);
        sendProEndingSoonEmail(user, periodEnd).catch(e =>
          console.error("[Billing] ending-soon email failed:", e.message)
        );
      }

      // A failed renewal leaves the subscription alive but unpaid. Without this
      // the workspace keeps drawing a Pro allowance it is no longer paying for.
      if (user && DEAD_SUB_STATUSES.has(sub.status)) {
        await downgradeToFree(user._id.toString());
        console.log(`[Billing] Sub ${sub.status} for ${user._id} → dropped to free`);
      } else if (user && sub.status === "active" && prev.status && prev.status !== "active") {
        await startProCycle(user._id.toString(), sub);
        console.log(`[Billing] Sub recovered for ${user._id} → Pro restored`);
      }
    }

    // ── Subscription fully expired (period ended after cancel_at_period_end) ─
    if (event.type === "customer.subscription.deleted") {
      const sub  = event.data.object;
      const user = await User.findOne({ stripeCustomerId: sub.customer });
      if (user) {
        await User.findByIdAndUpdate(user._id, { stripeSubscriptionId: null });
        await downgradeToFree(user._id.toString());
        console.log(`[Billing] Sub ended for user ${user._id} → free plan`);
        sendProEndedEmail(user, {
          endedOn: sub.ended_at ? new Date(sub.ended_at * 1000) : new Date(),
        }).catch(e => console.error("[Billing] pro-ended email failed:", e.message));
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Billing] webhook handler error:", err.message);
    res.status(500).json({ message: "Webhook processing failed." });
  }
}

export async function getNodeCostEndpoint(req, res) {
  const { nodeType } = req.params;
  const cost = getNodeCost(nodeType);
  res.json({ nodeType, credits: cost });
}

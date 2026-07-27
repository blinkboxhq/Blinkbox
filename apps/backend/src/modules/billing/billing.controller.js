import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import User from "../../models/user.model.js";
import { getNodeCost, addPurchasedCredits } from "../../infra/credit.engine.js";
import { sendProWelcomeEmail, sendProEndingSoonEmail } from "../../infra/email.service.js";
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

function nextCycleStart(billingCycleStart) {
  const from = new Date(billingCycleStart);
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
      percentUsed: Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)),
      billingCycleStart: usage.billingCycleStart,
      billingCycleEnd: nextCycleStart(usage.billingCycleStart),
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

    // If they have an active subscription, mark it to cancel at period end
    // rather than immediately, so they keep Pro access until the cycle ends.
    if (user.stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (sub.status === "active" && !sub.cancel_at_period_end) {
        // Charge an invoice item for credits already used this cycle
        const usage = await WorkspaceUsage.findOne({ workspaceId: user._id.toString() });
        const creditsUsed = usage?.creditsUsed || 0;
        const proLimit    = WorkspaceUsage.PLAN_LIMITS.pro;
        if (creditsUsed > 0) {
          const fractionUsed  = Math.min(1, creditsUsed / proLimit);
          // Plan price prorated by credit consumption — billed in cents
          const chargeAmount  = Math.round(fractionUsed * PLANS.pro.priceUsd * 100);
          if (chargeAmount > 0) {
            await stripe.invoiceItems.create({
              customer:    user.stripeCustomerId,
              amount:      chargeAmount,
              currency:    "usd",
              description: `Blinkbox Pro — ${creditsUsed.toLocaleString()} credits used (${Math.round(fractionUsed * 100)}% of plan)`,
            });
            // Immediately invoice so the charge runs now
            await stripe.invoices.create({
              customer:          user.stripeCustomerId,
              auto_advance:      true,
              collection_method: "charge_automatically",
            });
          }
        }
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }

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
    if (event.type === "checkout.session.completed" && event.data.object.metadata?.kind === "credits") {
      const session = event.data.object;
      const userId  = session.metadata.userId;
      const credits = Number(session.metadata.credits);

      if (userId && Number.isFinite(credits) && credits > 0) {
        const { credited } = await addPurchasedCredits(userId, {
          sessionId: session.id,
          packId: session.metadata.packId || null,
          credits,
          amountUsd: Number(session.metadata.amountUsd) || 0,
        });
        console.log(
          `[Billing] credit top-up for ${userId}: ${credited ? "applied" : "replay ignored"}`,
        );
        await rememberCard(userId, session.payment_intent);
      }
      return res.json({ received: true });
    }

    // ── New subscription ─────────────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      if (!userId) return res.json({ received: true });

      const user = await User.findByIdAndUpdate(
        userId,
        { stripeSubscriptionId: session.subscription },
        { new: true },
      );
      await WorkspaceUsage.findOneAndUpdate(
        { workspaceId: userId },
        { plan: "pro", monthlyLimit: WorkspaceUsage.PLAN_LIMITS.pro },
        { upsert: true },
      );

      // Welcome email
      if (user) {
        sendProWelcomeEmail(user).catch(e =>
          console.error("[Billing] welcome email failed:", e.message)
        );
      }
    }

    // ── Subscription updated (e.g. cancel_at_period_end flipped) ────────────
    if (event.type === "customer.subscription.updated") {
      const sub  = event.data.object;
      const prev = event.data.previous_attributes || {};

      // Only act when cancel_at_period_end just became true (user just cancelled)
      if (sub.cancel_at_period_end && prev.cancel_at_period_end === false) {
        const user = await User.findOne({ stripeCustomerId: sub.customer });
        if (user) {
          const periodEnd = new Date(sub.current_period_end * 1000);
          sendProEndingSoonEmail(user, periodEnd).catch(e =>
            console.error("[Billing] ending-soon email failed:", e.message)
          );
        }
      }
    }

    // ── Subscription fully expired (period ended after cancel_at_period_end) ─
    if (event.type === "customer.subscription.deleted") {
      const sub  = event.data.object;
      const user = await User.findOne({ stripeCustomerId: sub.customer });
      if (user) {
        await User.findByIdAndUpdate(user._id, { stripeSubscriptionId: null });

        // Prorate credits by fraction of Pro period actually used
        const periodStart  = sub.current_period_start * 1000;
        const periodEnd    = sub.current_period_end   * 1000;
        const fractionUsed = Math.min(1, (Date.now() - periodStart) / (periodEnd - periodStart));
        const proratedCap  = Math.floor(fractionUsed * WorkspaceUsage.PLAN_LIMITS.pro);

        const usage         = await WorkspaceUsage.findOne({ workspaceId: user._id.toString() });
        const cappedCredits = usage ? Math.min(usage.creditsUsed, proratedCap) : 0;

        await WorkspaceUsage.findOneAndUpdate(
          { workspaceId: user._id.toString() },
          { plan: "free", monthlyLimit: proratedCap, creditsUsed: cappedCredits },
          { upsert: true },
        );

        console.log(
          `[Billing] Sub expired for user ${user._id}: ${Math.round(fractionUsed * 100)}% used → cap=${proratedCap}, creditsUsed=${cappedCredits}`,
        );
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

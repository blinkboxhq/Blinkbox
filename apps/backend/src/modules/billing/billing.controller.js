import Stripe from "stripe";
import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import User from "../../models/user.model.js";
import { getNodeCost, addPurchasedCredits } from "../../infra/credit.engine.js";
import { sendProWelcomeEmail, sendProEndingSoonEmail } from "../../infra/email.service.js";
import { PLANS, CREDIT_PACKS, getPack, packSavingPercent } from "./credit.plans.js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_PRO,
  FRONTEND_URL,
} from "../../config/env.js";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

function nextCycleStart(billingCycleStart) {
  const from = new Date(billingCycleStart);
  return new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

export async function getUsage(req, res) {
  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);
    const planRemaining = Math.max(0, usage.monthlyLimit - usage.creditsUsed);
    const purchasedCredits = usage.purchasedCredits || 0;

    res.json({
      plan: usage.plan,
      creditsUsed: usage.creditsUsed,
      monthlyLimit: usage.monthlyLimit,
      planRemaining,
      purchasedCredits,
      purchasedSpent: usage.purchasedSpent || 0,
      balance: planRemaining + purchasedCredits,
      remaining: planRemaining + purchasedCredits,
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
    stripeReady: Boolean(stripe),
  });
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
 * Pay-as-you-go: a one-time charge for a credit pack. Priced inline so packs
 * can be re-tuned in credit.plans.js without minting Stripe price IDs.
 */
export async function createCreditCheckout(req, res) {
  if (!stripe) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }

  const pack = getPack(req.body?.packId);
  if (!pack) {
    return res.status(400).json({ message: "Unknown credit pack." });
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
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceUsd * 100,
            product_data: {
              name: `${pack.credits.toLocaleString()} Blinkbox credits`,
              description: "Credits never expire and roll over month to month.",
            },
          },
        },
      ],
      success_url: `${FRONTEND_URL}/dashboard?tab=usage&purchase=success`,
      cancel_url: `${FRONTEND_URL}/dashboard?tab=usage&purchase=cancelled`,
      metadata: {
        userId: user._id.toString(),
        kind: "credits",
        packId: pack.id,
        credits: String(pack.credits),
        amountUsd: String(pack.priceUsd),
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
          packId: session.metadata.packId,
          credits,
          amountUsd: Number(session.metadata.amountUsd) || 0,
        });
        console.log(
          `[Billing] credit pack ${session.metadata.packId} for ${userId}: ${credited ? "applied" : "replay ignored"}`,
        );
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

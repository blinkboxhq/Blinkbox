import Stripe from "stripe";
import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import User from "../../models/user.model.js";
import { getNodeCost } from "../../infra/credit.engine.js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_PRO,
  FRONTEND_URL,
} from "../../config/env.js";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

export async function getUsage(req, res) {
  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);
    res.json({
      plan: usage.plan,
      creditsUsed: usage.creditsUsed,
      monthlyLimit: usage.monthlyLimit,
      remaining: usage.monthlyLimit - usage.creditsUsed,
      percentUsed: Math.round((usage.creditsUsed / usage.monthlyLimit) * 100),
      billingCycleStart: usage.billingCycleStart,
      costTable: { standard: 1, http_request: 5, ai_agent: 10, web_scraper: 15 },
    });
  } catch (err) {
    console.error("[Billing] getUsage error:", err.message);
    res.status(500).json({ message: "Failed to fetch usage data." });
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
      success_url: `${FRONTEND_URL}/dashboard?upgrade=success`,
      cancel_url: `${FRONTEND_URL}/dashboard?upgrade=cancelled`,
      metadata: { userId: user._id.toString() },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[Billing] createCheckoutSession error:", err.message);
    res.status(500).json({ message: "Failed to create checkout session." });
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

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
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

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature failed: ${err.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId) return res.json({ received: true });

      await User.findByIdAndUpdate(userId, { stripeSubscriptionId: session.subscription });
      await WorkspaceUsage.findOneAndUpdate(
        { workspaceId: userId },
        { plan: "pro", monthlyLimit: WorkspaceUsage.PLAN_LIMITS.pro },
        { upsert: true },
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const user = await User.findOne({ stripeCustomerId: sub.customer });
      if (user) {
        await User.findByIdAndUpdate(user._id, { stripeSubscriptionId: null });
        await WorkspaceUsage.findOneAndUpdate(
          { workspaceId: user._id.toString() },
          { plan: "free", monthlyLimit: WorkspaceUsage.PLAN_LIMITS.free },
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

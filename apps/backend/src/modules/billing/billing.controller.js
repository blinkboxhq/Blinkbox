/**
 * Billing Controller — Usage & Credit Management
 *
 * Endpoints:
 *   GET  /api/billing/usage     — Current cycle usage summary
 *   GET  /api/billing/history   — Recent credit deduction history
 *   POST /api/billing/upgrade   — Upgrade plan tier (placeholder for payment integration)
 */

import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import { getNodeCost } from "../../infra/credit.engine.js";

/**
 * GET /api/billing/usage
 * Returns current billing cycle usage for the authenticated workspace.
 */
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
      // Cost reference so the frontend can display prices
      costTable: {
        standard: 1,
        http_request: 5,
        ai_agent: 10,
        web_scraper: 15,
      },
    });
  } catch (err) {
    console.error("[Billing] getUsage error:", err.message);
    res.status(500).json({ message: "Failed to fetch usage data." });
  }
}

/**
 * GET /api/billing/history
 * Returns the last 100 credit deductions for audit.
 */
export async function getHistory(req, res) {
  try {
    const usage = await WorkspaceUsage.getOrCreate(req.user.id);

    res.json({
      history: usage.history || [],
      totalEntries: (usage.history || []).length,
    });
  } catch (err) {
    console.error("[Billing] getHistory error:", err.message);
    res.status(500).json({ message: "Failed to fetch usage history." });
  }
}

/**
 * POST /api/billing/upgrade
 * Placeholder for plan upgrade. In production, this would integrate
 * with Stripe/Razorpay. For now, it just changes the plan tier.
 *
 * Body: { plan: "starter" | "pro" | "enterprise" }
 */
export async function upgradePlan(req, res) {
  try {
    const { plan } = req.body;
    const validPlans = ["free", "starter", "pro", "enterprise"];

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({
        message: `Invalid plan. Choose from: ${validPlans.join(", ")}`,
      });
    }

    const limits = WorkspaceUsage.PLAN_LIMITS;
    const newLimit = limits[plan];

    const usage = await WorkspaceUsage.findOneAndUpdate(
      { workspaceId: req.user.id },
      {
        plan,
        monthlyLimit: newLimit === Infinity ? 999999999 : newLimit,
      },
      { new: true, upsert: true },
    );

    res.json({
      message: `Plan upgraded to "${plan}".`,
      plan: usage.plan,
      monthlyLimit: usage.monthlyLimit,
      creditsUsed: usage.creditsUsed,
      remaining: usage.monthlyLimit - usage.creditsUsed,
    });
  } catch (err) {
    console.error("[Billing] upgradePlan error:", err.message);
    res.status(500).json({ message: "Failed to upgrade plan." });
  }
}

/**
 * GET /api/billing/cost/:nodeType
 * Returns the credit cost for a specific node type.
 */
export async function getNodeCostEndpoint(req, res) {
  const { nodeType } = req.params;
  const cost = getNodeCost(nodeType);
  res.json({ nodeType, credits: cost });
}

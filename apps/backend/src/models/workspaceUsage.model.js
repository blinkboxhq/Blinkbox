/**
 * WorkspaceUsage Model — Fastlane Economics
 *
 * Tracks credit consumption per workspace per billing cycle.
 * Each workspace has a monthly credit limit. When exceeded,
 * the execution engine blocks new node runs and emits quota_exceeded.
 *
 * Schema:
 *   workspaceId     — Maps to user.id (workspace owner)
 *   billingCycleStart — Start of current billing period (1st of month)
 *   creditsUsed     — Total credits consumed this cycle
 *   monthlyLimit    — Credit cap for this workspace (plan-based)
 *   plan            — "free" | "starter" | "pro" | "enterprise"
 *   history         — Rolling log of last 100 deductions for audit
 */

import mongoose from "mongoose";

const DeductionSchema = new mongoose.Schema(
  {
    executionId: { type: String, required: true },
    nodeId: { type: String, required: true },
    nodeType: { type: String, required: true },
    credits: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const WorkspaceUsageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Billing cycle
    billingCycleStart: {
      type: Date,
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
      },
    },

    // Credit tracking
    creditsUsed: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: 1000 }, // Free tier: 1000 credits/month

    // Plan tier
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },

    // Audit trail: last 100 deductions (capped with $slice)
    history: {
      type: [DeductionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Plan defaults
WorkspaceUsageSchema.statics.PLAN_LIMITS = {
  free: 1000,
  starter: 10000,
  pro: 100000,
  enterprise: Infinity,
};

/**
 * Get or create a usage record for a workspace.
 * Auto-resets credits if a new billing cycle has started.
 */
WorkspaceUsageSchema.statics.getOrCreate = async function (workspaceId) {
  let usage = await this.findOne({ workspaceId });

  if (!usage) {
    usage = await this.create({ workspaceId });
    return usage;
  }

  // Check if we need to roll into a new billing cycle
  const now = new Date();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (usage.billingCycleStart < cycleStart) {
    usage.billingCycleStart = cycleStart;
    usage.creditsUsed = 0;
    usage.history = [];
    await usage.save();
  }

  return usage;
};

export default mongoose.model("WorkspaceUsage", WorkspaceUsageSchema);

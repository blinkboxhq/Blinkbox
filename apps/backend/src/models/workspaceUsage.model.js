/**
 * WorkspaceUsage Model — Blinkbox Credits
 *
 * A workspace holds credits in two buckets:
 *   Plan credits      — monthlyLimit minus creditsUsed. Resets every cycle.
 *   Purchased credits — bought pay-as-you-go. Never expires, rolls over.
 *
 * Spend always drains the plan bucket first so the monthly allowance is
 * never stranded behind a top-up. The execution engine blocks a node when
 * both buckets together cannot cover its cost.
 *
 * Schema:
 *   workspaceId       — Maps to user.id (workspace owner)
 *   billingCycleStart — Start of current billing period (1st of month)
 *   creditsUsed       — Plan credits consumed this cycle
 *   monthlyLimit      — Plan credit allowance for this cycle
 *   purchasedCredits  — Pay-as-you-go balance remaining
 *   purchasedSpent    — Lifetime purchased credits burned (reporting only)
 *   plan              — "free" | "starter" | "pro" | "enterprise"
 *   history           — Rolling log of last 100 deductions for audit
 *   purchases         — Rolling log of last 50 credit purchases
 */

import mongoose from "mongoose";
import { planCredits } from "../modules/billing/credit.plans.js";

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

const PurchaseSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    // Slider and auto-recharge top-ups have no pack — only legacy packs do.
    packId: { type: String, default: null },
    credits: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    auto: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AutoRechargeSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    thresholdCredits: { type: Number, default: 0 },
    amountUsd: { type: Number, default: 0 },
    monthlyCapUsd: { type: Number, default: 0 },
    paymentMethodId: { type: String, default: null },
    cardBrand: { type: String, default: null },
    cardLast4: { type: String, default: null },
    lastChargeAt: { type: Date, default: null },
    spentThisCycleUsd: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastFailure: { type: String, default: null },
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

    // Plan bucket — resets every cycle
    creditsUsed: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: () => planCredits("free") },

    // Purchased bucket — rolls over forever
    purchasedCredits: { type: Number, default: 0 },
    purchasedSpent: { type: Number, default: 0 },

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

    // Purchase trail: last 50 top-ups (capped with $slice)
    purchases: {
      type: [PurchaseSchema],
      default: [],
    },

    // Charge a saved card automatically when the balance runs low
    autoRecharge: {
      type: AutoRechargeSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// Plan defaults
WorkspaceUsageSchema.statics.PLAN_LIMITS = {
  free: planCredits("free"),
  starter: planCredits("starter"),
  pro: planCredits("pro"),
  enterprise: planCredits("enterprise"),
};

/**
 * Get or create a usage record for a workspace.
 * Rolling into a new cycle refills the plan bucket and re-syncs the allowance
 * to the current plan — purchased credits are deliberately untouched.
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
    usage.monthlyLimit = planCredits(usage.plan);
    usage.history = [];
    if (usage.autoRecharge) usage.autoRecharge.spentThisCycleUsd = 0;
    await usage.save();
  }

  return usage;
};

export default mongoose.model("WorkspaceUsage", WorkspaceUsageSchema);

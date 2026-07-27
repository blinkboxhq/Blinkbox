/**
 * Blinkbox Credits — the one unit of account.
 *
 * Two ways to get credits:
 *   1. A monthly plan grants an included allowance that resets each cycle.
 *   2. Pay-as-you-go packs top up a balance that never expires.
 *
 * Spend order is always plan credits first, purchased credits second, so a
 * cycle's allowance is never stranded by a top-up bought mid-month.
 */

export const PLANS = {
  free: {
    id: "free",
    label: "Free",
    priceUsd: 0,
    credits: 1000,
    blurb: "For trying things out.",
    features: [
      "1,000 credits every month",
      "Unlimited workflows",
      "Webhook, schedule & app triggers",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceUsd: 19,
    credits: 30000,
    blurb: "For teams running automation daily.",
    features: [
      "30,000 credits every month",
      "Buy extra credits any time",
      "AI agent builder",
      "Headless web scraping",
      "Team collaboration",
      "Advanced analytics",
      "Priority support",
    ],
  },
};

// Legacy tiers still present on old workspace records.
export const LEGACY_PLAN_CREDITS = {
  starter: 10000,
  enterprise: Number.MAX_SAFE_INTEGER,
};

// Flat pay-as-you-go rate: $1 buys PAYG_CREDITS_PER_USD credits, at any size.
export const PAYG_CREDITS_PER_USD = 1024;
export const PAYG_MIN_USD = 5;
export const PAYG_MAX_USD = 500;

// Presets behind the amount slider — the same rate, just fewer drags.
export const CREDIT_PACKS = [10, 25, 50, 100].map((priceUsd) => ({
  id: `pack_${priceUsd}`,
  priceUsd,
  credits: priceUsd * PAYG_CREDITS_PER_USD,
  ...(priceUsd === 25 ? { popular: true } : {}),
}));

export function creditsForUsd(amountUsd) {
  return Math.round(amountUsd * PAYG_CREDITS_PER_USD);
}

// What a credit balance is worth, in dollars, at the pay-as-you-go rate.
export function usdForCredits(credits) {
  return Math.max(0, credits || 0) / PAYG_CREDITS_PER_USD;
}

/**
 * Whole dollars only. Stripe charges in cents, and a slider that lands on
 * $17.34 makes both the receipt and the credit figure unreadable.
 * Returns null for anything outside the buyable range.
 */
export function normalizePaygUsd(input) {
  const usd = Math.round(Number(input));
  if (!Number.isFinite(usd) || usd < PAYG_MIN_USD || usd > PAYG_MAX_USD) return null;
  return usd;
}

/**
 * Auto-recharge — charging a saved card without the user present is the one
 * place this codebase spends money on its own, so every bound is explicit:
 * a floor under the trigger point, a ceiling on the per-cycle spend, and a
 * cooldown so a burst of executions can only ever produce one charge.
 */
export const AUTO_RECHARGE_MIN_THRESHOLD = 100;
export const AUTO_RECHARGE_MAX_THRESHOLD = 200000;
export const AUTO_RECHARGE_DEFAULT_CAP_USD = 100;
export const AUTO_RECHARGE_MAX_CAP_USD = 2000;
export const AUTO_RECHARGE_COOLDOWN_MS = 5 * 60 * 1000;
export const AUTO_RECHARGE_MAX_FAILURES = 3;

/**
 * Validate an auto-recharge setting change. Returns `{ error }` with a
 * user-facing message, or `{ value }` with the settings safe to persist.
 */
export function normalizeAutoRecharge(input) {
  if (!input || typeof input !== "object") return { error: "Missing auto-recharge settings." };

  if (!input.enabled) return { value: { enabled: false } };

  const thresholdCredits = Math.round(Number(input.thresholdCredits));
  const amountUsd = normalizePaygUsd(input.amountUsd);
  const monthlyCapUsd =
    input.monthlyCapUsd === undefined || input.monthlyCapUsd === null
      ? AUTO_RECHARGE_DEFAULT_CAP_USD
      : Math.round(Number(input.monthlyCapUsd));

  if (!amountUsd) {
    return { error: `Top-up must be between $${PAYG_MIN_USD} and $${PAYG_MAX_USD}.` };
  }
  if (
    !Number.isFinite(thresholdCredits) ||
    thresholdCredits < AUTO_RECHARGE_MIN_THRESHOLD ||
    thresholdCredits > AUTO_RECHARGE_MAX_THRESHOLD
  ) {
    return {
      error: `Trigger must be between ${AUTO_RECHARGE_MIN_THRESHOLD.toLocaleString()} and ${AUTO_RECHARGE_MAX_THRESHOLD.toLocaleString()} credits.`,
    };
  }
  if (!Number.isFinite(monthlyCapUsd) || monthlyCapUsd < amountUsd || monthlyCapUsd > AUTO_RECHARGE_MAX_CAP_USD) {
    return {
      error: `Monthly cap must be between the top-up amount and $${AUTO_RECHARGE_MAX_CAP_USD}.`,
    };
  }
  // A top-up that lands back under the trigger would recharge again forever.
  if (creditsForUsd(amountUsd) <= thresholdCredits) {
    return { error: "Top-up must add more credits than the trigger point, or it will never stop." };
  }

  return { value: { enabled: true, thresholdCredits, amountUsd, monthlyCapUsd } };
}

/**
 * Decide whether an auto top-up is due. Pure on purpose — this is the rule
 * that spends money, so it stays testable without Stripe, Redis or Mongo.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function shouldRecharge(usage, now = Date.now()) {
  const settings = usage?.autoRecharge;
  if (!settings?.enabled) return { ok: false, reason: "disabled" };
  if (!settings.paymentMethodId) return { ok: false, reason: "no_card" };
  if ((settings.failureCount || 0) >= AUTO_RECHARGE_MAX_FAILURES) {
    return { ok: false, reason: "too_many_failures" };
  }

  const balance = Math.max(0, usage.monthlyLimit - usage.creditsUsed) + (usage.purchasedCredits || 0);
  if (balance >= settings.thresholdCredits) return { ok: false, reason: "above_threshold" };

  const since = settings.lastChargeAt ? now - new Date(settings.lastChargeAt).getTime() : Infinity;
  if (since < AUTO_RECHARGE_COOLDOWN_MS) return { ok: false, reason: "cooldown" };

  if ((settings.spentThisCycleUsd || 0) + settings.amountUsd > settings.monthlyCapUsd) {
    return { ok: false, reason: "cap_reached" };
  }

  return { ok: true };
}

export function planCredits(plan) {
  return PLANS[plan]?.credits ?? LEGACY_PLAN_CREDITS[plan] ?? PLANS.free.credits;
}

export function getPack(packId) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) || null;
}

/**
 * Credits per dollar, used to show the per-pack saving against the smallest
 * pack. Plan credits are excluded — they are a different commitment.
 */
export function packRate(pack) {
  return pack.credits / pack.priceUsd;
}

// Zero while the pay-as-you-go rate is flat — callers hide the badge at 0.
export function packSavingPercent(pack) {
  const base = packRate(CREDIT_PACKS[0]);
  return Math.round(((packRate(pack) - base) / base) * 100);
}

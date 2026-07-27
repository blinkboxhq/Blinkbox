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

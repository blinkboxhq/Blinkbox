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
    credits: 2000,
    blurb: "For trying things out.",
    features: [
      "2,000 credits every month",
      "Unlimited workflows",
      "Webhook, schedule & app triggers",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceUsd: 19,
    credits: 150000,
    blurb: "For teams running automation daily.",
    features: [
      "150,000 credits every month",
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

export const CREDIT_PACKS = [
  { id: "pack_10", priceUsd: 10, credits: 50000 },
  { id: "pack_25", priceUsd: 25, credits: 140000, popular: true },
  { id: "pack_50", priceUsd: 50, credits: 300000 },
  { id: "pack_100", priceUsd: 100, credits: 650000 },
];

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

export function packSavingPercent(pack) {
  const base = packRate(CREDIT_PACKS[0]);
  return Math.round(((packRate(pack) - base) / base) * 100);
}

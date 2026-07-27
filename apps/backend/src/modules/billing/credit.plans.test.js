import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANS,
  CREDIT_PACKS,
  PAYG_CREDITS_PER_USD,
  PAYG_MIN_USD,
  PAYG_MAX_USD,
  getPack,
  planCredits,
  packRate,
  creditsForUsd,
  usdForCredits,
  normalizePaygUsd,
  normalizeAutoRecharge,
  shouldRecharge,
  AUTO_RECHARGE_MIN_THRESHOLD,
  AUTO_RECHARGE_MAX_THRESHOLD,
  AUTO_RECHARGE_MAX_CAP_USD,
  AUTO_RECHARGE_COOLDOWN_MS,
  AUTO_RECHARGE_MAX_FAILURES,
} from "./credit.plans.js";
import { splitSpend } from "../../infra/credit.engine.js";

test("the catalog offers exactly one paid plan and pay-as-you-go packs", () => {
  const paid = Object.values(PLANS).filter((p) => p.priceUsd > 0);
  assert.equal(paid.length, 1);
  assert.equal(paid[0].id, "pro");
  assert.equal(paid[0].priceUsd, 19);
  assert.ok(CREDIT_PACKS.length >= 2);
  assert.equal(new Set(CREDIT_PACKS.map((p) => p.id)).size, CREDIT_PACKS.length);
});

test("bigger packs never cost more per credit", () => {
  const sorted = [...CREDIT_PACKS].sort((a, b) => a.priceUsd - b.priceUsd);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(
      packRate(sorted[i]) >= packRate(sorted[i - 1]),
      `${sorted[i].id} is worse value than ${sorted[i - 1].id}`,
    );
  }
});

test("every pack buys credits at the published pay-as-you-go rate", () => {
  for (const pack of CREDIT_PACKS) {
    assert.equal(packRate(pack), PAYG_CREDITS_PER_USD, `${pack.id} is off-rate`);
  }
});

test("the plan allowance is better value per dollar than buying packs", () => {
  assert.ok(PLANS.pro.credits / PLANS.pro.priceUsd > PAYG_CREDITS_PER_USD);
});

test("a slider amount buys credits at the same flat rate as a pack", () => {
  assert.equal(creditsForUsd(1), PAYG_CREDITS_PER_USD);
  assert.equal(creditsForUsd(37), 37 * PAYG_CREDITS_PER_USD);
  for (const pack of CREDIT_PACKS) {
    assert.equal(creditsForUsd(pack.priceUsd), pack.credits);
  }
});

test("the slider amount is clamped to whole buyable dollars", () => {
  assert.equal(normalizePaygUsd(PAYG_MIN_USD), PAYG_MIN_USD);
  assert.equal(normalizePaygUsd(PAYG_MAX_USD), PAYG_MAX_USD);
  assert.equal(normalizePaygUsd("42"), 42);
  assert.equal(normalizePaygUsd(17.34), 17);
  assert.equal(normalizePaygUsd(16.5), 17);
});

test("an unbuyable amount is refused rather than charged", () => {
  for (const bad of [
    PAYG_MIN_USD - 1,
    PAYG_MAX_USD + 1,
    0,
    -50,
    "",
    "  ",
    null,
    undefined,
    "free",
    NaN,
    Infinity,
    -Infinity,
    {},
    [],
  ]) {
    assert.equal(normalizePaygUsd(bad), null, `${String(bad)} should not be buyable`);
  }
});

test("a credit balance converts back to the dollars it cost", () => {
  assert.equal(usdForCredits(PAYG_CREDITS_PER_USD), 1);
  assert.equal(usdForCredits(creditsForUsd(25)), 25);
  assert.equal(usdForCredits(0), 0);
  // An over-drafted balance is worth nothing, not a negative refund.
  assert.equal(usdForCredits(-5000), 0);
  assert.equal(usdForCredits(null), 0);
  assert.equal(usdForCredits(undefined), 0);
});

test("auto-recharge off needs no other settings", () => {
  assert.deepEqual(normalizeAutoRecharge({ enabled: false }), { value: { enabled: false } });
  assert.deepEqual(normalizeAutoRecharge({ enabled: false, thresholdCredits: 1 }), {
    value: { enabled: false },
  });
  assert.ok(normalizeAutoRecharge(null).error);
  assert.ok(normalizeAutoRecharge("yes").error);
});

test("a valid auto-recharge setup is accepted with a default cap", () => {
  assert.deepEqual(normalizeAutoRecharge({ enabled: true, thresholdCredits: 500, amountUsd: 25 }), {
    value: { enabled: true, thresholdCredits: 500, amountUsd: 25, monthlyCapUsd: 100 },
  });
  assert.deepEqual(
    normalizeAutoRecharge({ enabled: true, thresholdCredits: "500", amountUsd: "25", monthlyCapUsd: "50" }),
    { value: { enabled: true, thresholdCredits: 500, amountUsd: 25, monthlyCapUsd: 50 } },
  );
});

test("a top-up smaller than the trigger point is refused as a charge loop", () => {
  // $5 buys 5,120 credits — landing back under a 10,000 trigger would recharge forever.
  assert.ok(normalizeAutoRecharge({ enabled: true, thresholdCredits: 10000, amountUsd: 5 }).error);
  assert.ok(
    normalizeAutoRecharge({ enabled: true, thresholdCredits: PAYG_CREDITS_PER_USD * 5, amountUsd: 5 }).error,
  );
  assert.ok(normalizeAutoRecharge({ enabled: true, thresholdCredits: 5000, amountUsd: 5 }).value);
});

test("auto-recharge bounds are enforced on every field", () => {
  const ok = { enabled: true, thresholdCredits: 500, amountUsd: 25, monthlyCapUsd: 100 };
  assert.ok(normalizeAutoRecharge({ ...ok, amountUsd: PAYG_MIN_USD - 1 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, amountUsd: PAYG_MAX_USD + 1 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, thresholdCredits: AUTO_RECHARGE_MIN_THRESHOLD - 1 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, thresholdCredits: AUTO_RECHARGE_MAX_THRESHOLD + 1 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, thresholdCredits: NaN }).error);
  // A cap under the top-up could never let a single charge through.
  assert.ok(normalizeAutoRecharge({ ...ok, monthlyCapUsd: 10 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, monthlyCapUsd: AUTO_RECHARGE_MAX_CAP_USD + 1 }).error);
  assert.ok(normalizeAutoRecharge({ ...ok, monthlyCapUsd: 25 }).value);
});

const chargeable = {
  monthlyLimit: 1000,
  creditsUsed: 1000,
  purchasedCredits: 200,
  billingCycleStart: new Date("2026-07-01"),
  autoRecharge: {
    enabled: true,
    thresholdCredits: 500,
    amountUsd: 25,
    monthlyCapUsd: 100,
    paymentMethodId: "pm_test",
    spentThisCycleUsd: 0,
    failureCount: 0,
    lastChargeAt: null,
  },
};

const withSettings = (patch) => ({ ...chargeable, autoRecharge: { ...chargeable.autoRecharge, ...patch } });

test("a balance under the trigger point with a saved card is chargeable", () => {
  assert.deepEqual(shouldRecharge(chargeable), { ok: true });
});

test("auto-recharge holds off unless every condition is met", () => {
  const cases = [
    ["disabled", withSettings({ enabled: false })],
    ["disabled", { ...chargeable, autoRecharge: undefined }],
    ["disabled", undefined],
    ["no_card", withSettings({ paymentMethodId: null })],
    ["too_many_failures", withSettings({ failureCount: AUTO_RECHARGE_MAX_FAILURES })],
    ["above_threshold", { ...chargeable, purchasedCredits: 500 }],
    ["above_threshold", { ...chargeable, creditsUsed: 0, purchasedCredits: 0 }],
    ["cooldown", withSettings({ lastChargeAt: new Date(Date.now() - AUTO_RECHARGE_COOLDOWN_MS / 2) })],
    ["cap_reached", withSettings({ spentThisCycleUsd: 100 })],
    ["cap_reached", withSettings({ spentThisCycleUsd: 80 })],
  ];
  for (const [reason, usage] of cases) {
    assert.deepEqual(shouldRecharge(usage), { ok: false, reason });
  }
});

test("the cooldown expires rather than blocking forever", () => {
  const usage = withSettings({ lastChargeAt: new Date(Date.now() - AUTO_RECHARGE_COOLDOWN_MS - 1000) });
  assert.deepEqual(shouldRecharge(usage), { ok: true });
});

test("an over-drafted plan bucket does not mask an empty balance", () => {
  // creditsUsed above monthlyLimit must not make the balance look negative-free.
  const usage = { ...chargeable, creditsUsed: 5000, purchasedCredits: 0 };
  assert.deepEqual(shouldRecharge(usage), { ok: true });
});

test("an unknown pack id is refused rather than guessed", () => {
  assert.equal(getPack("pack_free_money"), null);
  assert.equal(getPack(undefined), null);
});

test("an unknown plan falls back to the free allowance", () => {
  assert.equal(planCredits("free"), PLANS.free.credits);
  assert.equal(planCredits("pro"), PLANS.pro.credits);
  assert.equal(planCredits("starter"), 10000);
  assert.equal(planCredits("nonsense"), PLANS.free.credits);
});

test("spend drains the plan bucket before purchased credits", () => {
  assert.deepEqual(splitSpend(10, 100, 500), { fromPlan: 10, fromPurchased: 0, covered: true });
  assert.deepEqual(splitSpend(10, 4, 500), { fromPlan: 4, fromPurchased: 6, covered: true });
  assert.deepEqual(splitSpend(10, 0, 500), { fromPlan: 0, fromPurchased: 10, covered: true });
});

test("spend never goes negative and reports when it cannot be covered", () => {
  assert.deepEqual(splitSpend(10, 0, 0), { fromPlan: 0, fromPurchased: 0, covered: false });
  assert.deepEqual(splitSpend(10, 3, 2), { fromPlan: 3, fromPurchased: 2, covered: false });
  // An over-drafted plan bucket must not lend credits back.
  assert.deepEqual(splitSpend(5, -20, 8), { fromPlan: 0, fromPurchased: 5, covered: true });
});

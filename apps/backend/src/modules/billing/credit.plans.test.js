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
  normalizePaygUsd,
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

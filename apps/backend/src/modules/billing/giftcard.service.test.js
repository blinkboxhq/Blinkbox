import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const { default: GiftCard } = await import("../../models/giftCard.model.js");
const { default: WorkspaceUsage } = await import("../../models/workspaceUsage.model.js");
const { issueGiftCards, peekGiftCard, redeemGiftCard, normalizeCode } = await import("./giftcard.service.js");
const { creditsForUsd } = await import("./credit.plans.js");

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await GiftCard.deleteMany({});
  await WorkspaceUsage.deleteMany({});
});

const mint = (over = {}) =>
  issueGiftCards({ amountUsd: 10, count: 1, issuedBy: "admin-1", ...over });

test("a $10 card is worth $10 of credits and the code is never stored in the clear", async () => {
  const [card] = await mint();

  assert.equal(card.amountUsd, 10);
  assert.equal(card.credits, creditsForUsd(10));
  assert.match(card.code, /^BBOX-[2-9A-HJ-NP-TV-Z]{4}-[2-9A-HJ-NP-TV-Z]{4}-[2-9A-HJ-NP-TV-Z]{4}$/);

  const stored = await GiftCard.findById(card.id).lean();
  assert.notEqual(stored.codeHash, card.code);
  assert.equal(JSON.stringify(stored).includes(card.code), false);
  assert.equal(stored.last4, card.code.slice(-4));
});

test("redeeming lands the credits in the redeemer's purchased balance", async () => {
  const [card] = await mint();

  const result = await redeemGiftCard(card.code, "ws-alice");
  assert.equal(result.credits, creditsForUsd(10));
  assert.equal(result.purchasedCredits, creditsForUsd(10));

  const usage = await WorkspaceUsage.findOne({ workspaceId: "ws-alice" }).lean();
  assert.equal(usage.purchasedCredits, creditsForUsd(10));

  const stored = await GiftCard.findById(card.id).lean();
  assert.equal(stored.status, "redeemed");
  assert.equal(stored.redeemedBy, "ws-alice");
});

test("a second person cannot spend a card that is already redeemed", async () => {
  const [card] = await mint();
  await redeemGiftCard(card.code, "ws-alice");

  await assert.rejects(() => redeemGiftCard(card.code, "ws-bob"), (err) => {
    assert.equal(err.reason, "already_redeemed");
    assert.equal(err.status, 409);
    return true;
  });

  const bob = await WorkspaceUsage.findOne({ workspaceId: "ws-bob" }).lean();
  assert.equal(bob, null);
});

test("the same person retrying their own redeem is paid once, not twice", async () => {
  const [card] = await mint();
  await redeemGiftCard(card.code, "ws-alice");
  const replay = await redeemGiftCard(card.code, "ws-alice");

  assert.equal(replay.replayed, true);
  assert.equal(replay.purchasedCredits, creditsForUsd(10));

  const usage = await WorkspaceUsage.findOne({ workspaceId: "ws-alice" }).lean();
  assert.equal(usage.purchasedCredits, creditsForUsd(10));
});

test("two people racing the same code produce exactly one winner", async () => {
  const [card] = await mint();

  const results = await Promise.allSettled([
    redeemGiftCard(card.code, "ws-alice"),
    redeemGiftCard(card.code, "ws-bob"),
  ]);

  const won = results.filter((r) => r.status === "fulfilled");
  assert.equal(won.length, 1);

  const total =
    ((await WorkspaceUsage.findOne({ workspaceId: "ws-alice" }).lean())?.purchasedCredits || 0) +
    ((await WorkspaceUsage.findOne({ workspaceId: "ws-bob" }).lean())?.purchasedCredits || 0);
  assert.equal(total, creditsForUsd(10));
});

test("an expired card pays nobody", async () => {
  const [card] = await mint({ expiresAt: new Date(Date.now() - 1000) });

  await assert.rejects(() => redeemGiftCard(card.code, "ws-alice"), (err) => {
    assert.equal(err.reason, "expired");
    return true;
  });
  assert.equal(await WorkspaceUsage.findOne({ workspaceId: "ws-alice" }).lean(), null);
});

test("a voided card pays nobody", async () => {
  const [card] = await mint();
  await GiftCard.findByIdAndUpdate(card.id, { status: "void" });

  await assert.rejects(() => redeemGiftCard(card.code, "ws-alice"), (err) => {
    assert.equal(err.reason, "void");
    return true;
  });
});

test("an unknown code is rejected without touching any balance", async () => {
  await assert.rejects(() => redeemGiftCard("BBOX-2345-6789-ABCD", "ws-alice"), (err) => {
    assert.equal(err.reason, "not_found");
    assert.equal(err.status, 404);
    return true;
  });
});

test("garbage is rejected before it reaches the database", async () => {
  for (const bad of ["", "hello", "BBOX-0000-0000-0000", null, 42]) {
    await assert.rejects(() => redeemGiftCard(bad, "ws-alice"), (err) => {
      assert.equal(err.reason, "malformed");
      return true;
    });
  }
});

test("codes are accepted however a human types them", async () => {
  const [card] = await mint();
  const bare = card.code.replace(/-/g, "").replace(/^BBOX/, "");

  assert.equal(normalizeCode(bare.toLowerCase()), card.code);
  assert.equal(normalizeCode(` ${bare} `), card.code);
  assert.equal(normalizeCode(card.code.toLowerCase()), card.code);

  const result = await redeemGiftCard(bare.toLowerCase(), "ws-alice");
  assert.equal(result.credits, creditsForUsd(10));
});

test("peek reports value without spending the card", async () => {
  const [card] = await mint();

  const preview = await peekGiftCard(card.code);
  assert.equal(preview.valid, true);
  assert.equal(preview.amountUsd, 10);

  assert.equal((await GiftCard.findById(card.id).lean()).status, "active");
});

test("a batch mints distinct codes", async () => {
  const cards = await mint({ count: 25, batch: "launch" });
  assert.equal(cards.length, 25);
  assert.equal(new Set(cards.map((c) => c.code)).size, 25);
});

test("nonsense amounts and batch sizes are refused", async () => {
  await assert.rejects(() => mint({ amountUsd: 0 }), /whole dollar/);
  await assert.rejects(() => mint({ amountUsd: -10 }), /whole dollar/);
  await assert.rejects(() => mint({ amountUsd: 99999 }), /whole dollar/);
  await assert.rejects(() => mint({ count: 0 }), /Count must be/);
  await assert.rejects(() => mint({ count: 5000 }), /Count must be/);
});

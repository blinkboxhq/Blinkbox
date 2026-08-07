import GiftCard from "../../models/giftCard.model.js";
import { redis } from "../../infra/redis.client.js";
import { issueGiftCards, peekGiftCard, redeemGiftCard } from "./giftcard.service.js";

// A gift code is a bearer token, so guessing is the attack. The window is per
// account rather than per IP — an attacker controls their address, not the
// cost of making accounts, and this is the cheaper thing to bound.
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_SEC = 3600;

// Fails closed. A gift code is money, and without Redis there is no ceiling on
// guessing at all — better to turn redemption off for the minutes Redis is down
// than to leave the whole card space open to a script.
async function guardAttempt(workspaceId) {
  const key = `gift:attempts:${workspaceId}`;
  let count;
  try {
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ATTEMPT_WINDOW_SEC);
  } catch (err) {
    console.error("[GiftCard] attempt guard unavailable:", err.message);
    throw Object.assign(new Error("Gift codes are temporarily unavailable. Try again in a minute."), { status: 503 });
  }
  if (count > ATTEMPT_LIMIT) {
    throw Object.assign(new Error("Too many gift code attempts. Try again later."), { status: 429 });
  }
}

async function clearAttempts(workspaceId) {
  await redis.del(`gift:attempts:${workspaceId}`).catch(() => {});
}

/** POST /api/billing/gift-cards — admin only. Codes are returned once, here. */
export async function createGiftCards(req, res) {
  try {
    const cards = await issueGiftCards({
      amountUsd: req.body?.amountUsd,
      count: req.body?.count ?? 1,
      note: typeof req.body?.note === "string" ? req.body.note.slice(0, 200) : null,
      expiresAt: req.body?.expiresAt || null,
      batch: typeof req.body?.batch === "string" ? req.body.batch.slice(0, 60) : null,
      issuedBy: req.user.id,
    });

    res.status(201).json({
      cards,
      warning: "These codes are shown once and cannot be recovered. Copy them now.",
    });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("[GiftCard] issue error:", err.message);
    res.status(status).json({ message: status === 500 ? "Failed to issue gift cards." : err.message });
  }
}

/** GET /api/billing/gift-cards — admin only. Never returns a usable code. */
export async function listGiftCards(req, res) {
  try {
    const filter = {};
    if (["active", "redeemed", "void"].includes(req.query?.status)) filter.status = req.query.status;
    if (req.query?.batch) filter.batch = String(req.query.batch).slice(0, 60);

    const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 200);
    const cards = await GiftCard.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    res.json({
      cards: cards.map((c) => ({
        id: c._id.toString(),
        masked: `BBOX-••••-••••-${c.last4}`,
        credits: c.credits,
        amountUsd: c.amountUsd,
        status: c.status,
        note: c.note,
        batch: c.batch,
        expiresAt: c.expiresAt,
        redeemedAt: c.redeemedAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GiftCard] list error:", err.message);
    res.status(500).json({ message: "Failed to list gift cards." });
  }
}

/** DELETE /api/billing/gift-cards/:id — admin only. Voids an unredeemed card. */
export async function voidGiftCard(req, res) {
  try {
    const card = await GiftCard.findOneAndUpdate(
      { _id: req.params.id, status: "active" },
      { $set: { status: "void" } },
      { returnDocument: "after" },
    );
    if (!card) return res.status(409).json({ message: "That card is already redeemed or cancelled." });
    res.json({ id: card._id.toString(), status: card.status });
  } catch {
    res.status(400).json({ message: "Unknown gift card." });
  }
}

/** GET /api/billing/gift-cards/peek?code=… — what a code is worth, without spending it. */
export async function peekGiftCardEndpoint(req, res) {
  try {
    await guardAttempt(req.user.id);
    const result = await peekGiftCard(req.query?.code);
    if (result.valid) await clearAttempts(req.user.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("[GiftCard] peek error:", err.message);
    res.status(status).json({ message: status === 500 ? "Could not check that code." : err.message });
  }
}

/** POST /api/billing/gift-cards/redeem — spend a code into the caller's workspace. */
export async function redeemGiftCardEndpoint(req, res) {
  try {
    await guardAttempt(req.user.id);

    const result = await redeemGiftCard(req.body?.code, req.user.id);
    await clearAttempts(req.user.id);

    res.json({
      credits: result.credits,
      amountUsd: result.amountUsd,
      purchasedCredits: result.purchasedCredits,
      message: `${result.credits.toLocaleString()} credits added to your balance.`,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("[GiftCard] redeem error:", err.message);
    res.status(status).json({
      message: status === 500 ? "Could not redeem that code." : err.message,
      reason: err.reason,
    });
  }
}

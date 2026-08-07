/**
 * Gift card issue + redeem.
 *
 * Redemption is a two-step move: claim the card atomically, then credit the
 * balance. Both halves are idempotent on the card id, so a retry after a
 * half-finished redeem finishes the job instead of paying out twice.
 */

import crypto from "crypto";
import GiftCard from "../../models/giftCard.model.js";
import { addPurchasedCredits } from "../../infra/credit.engine.js";
import { creditsForUsd, PAYG_MAX_USD } from "./credit.plans.js";

// Crockford-style: no 0/1/I/L/O/U, so a code read off a card or over the phone
// has no ambiguous characters to guess at.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUPS = 3;
const GROUP_LEN = 4;

export const GIFT_MIN_USD = 1;
export const GIFT_MAX_USD = PAYG_MAX_USD;
export const GIFT_MAX_BATCH = 100;

function randomCode() {
  const len = GROUPS * GROUP_LEN;
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `BBOX-${out.match(/.{4}/g).join("-")}`;
}

/**
 * Accept what people actually type: lowercase, spaces, missing dashes, and a
 * pasted "BBOX" prefix or none at all. Anything that normalizes to the wrong
 * shape returns null rather than reaching the database.
 */
export function normalizeCode(input) {
  if (typeof input !== "string") return null;
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^BBOX/, "");
  if (raw.length !== GROUPS * GROUP_LEN) return null;
  if ([...raw].some((ch) => !ALPHABET.includes(ch))) return null;
  return `BBOX-${raw.match(/.{4}/g).join("-")}`;
}

export function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Mint `count` cards worth `amountUsd` each. The plaintext codes are returned
 * here and never stored — this response is the only time they exist.
 */
export async function issueGiftCards({ amountUsd, count = 1, note = null, issuedBy, expiresAt = null, batch = null }) {
  const usd = Math.round(Number(amountUsd));
  if (!Number.isFinite(usd) || usd < GIFT_MIN_USD || usd > GIFT_MAX_USD) {
    throw Object.assign(new Error(`Amount must be a whole dollar figure between $${GIFT_MIN_USD} and $${GIFT_MAX_USD}.`), { status: 400 });
  }

  const howMany = Math.trunc(Number(count));
  if (!Number.isFinite(howMany) || howMany < 1 || howMany > GIFT_MAX_BATCH) {
    throw Object.assign(new Error(`Count must be between 1 and ${GIFT_MAX_BATCH}.`), { status: 400 });
  }

  const credits = creditsForUsd(usd);
  const issued = [];

  for (let i = 0; i < howMany; i++) {
    // A duplicate is astronomically unlikely but the unique index is the only
    // thing that makes that a fact rather than an assumption.
    let card = null;
    for (let attempt = 0; attempt < 5 && !card; attempt++) {
      const code = randomCode();
      try {
        const doc = await GiftCard.create({
          codeHash: hashCode(code),
          last4: code.slice(-4),
          credits,
          amountUsd: usd,
          note,
          batch,
          issuedBy,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        });
        card = { id: doc._id.toString(), code, credits, amountUsd: usd, expiresAt: doc.expiresAt };
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    if (!card) throw new Error("Could not mint a unique gift code.");
    issued.push(card);
  }

  return issued;
}

function expired(card) {
  return !!card.expiresAt && card.expiresAt.getTime() <= Date.now();
}

/** Look a card up without spending it — powers the "what is this worth?" preview. */
export async function peekGiftCard(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, reason: "malformed" };

  const card = await GiftCard.findOne({ codeHash: hashCode(code) });
  if (!card) return { valid: false, reason: "not_found" };
  if (card.status === "void") return { valid: false, reason: "void" };
  if (card.status === "redeemed") return { valid: false, reason: "already_redeemed", redeemedAt: card.redeemedAt };
  if (expired(card)) return { valid: false, reason: "expired", expiresAt: card.expiresAt };

  return { valid: true, credits: card.credits, amountUsd: card.amountUsd, expiresAt: card.expiresAt };
}

/**
 * Spend a card into `workspaceId`.
 *
 * The claim is a single conditional update, so two people racing the same code
 * produce exactly one winner. Crediting runs after, keyed on the card id — if
 * the process dies between the two, the same user retrying the same code lands
 * back on their own already-claimed card and completes the payout.
 */
export async function redeemGiftCard(rawCode, workspaceId) {
  const code = normalizeCode(rawCode);
  if (!code) throw Object.assign(new Error("That doesn't look like a gift code."), { status: 400, reason: "malformed" });

  const codeHash = hashCode(code);
  const now = new Date();

  const claimed = await GiftCard.findOneAndUpdate(
    {
      codeHash,
      status: "active",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    { $set: { status: "redeemed", redeemedBy: workspaceId, redeemedAt: now } },
    { returnDocument: "after" },
  );

  const card = claimed || (await GiftCard.findOne({ codeHash }));

  if (!card) throw Object.assign(new Error("That gift code isn't valid."), { status: 404, reason: "not_found" });

  if (!claimed) {
    // Someone else's card, a voided one, or an expired one — say which, but
    // never leak who redeemed it.
    if (card.status === "void") throw Object.assign(new Error("That gift card was cancelled."), { status: 409, reason: "void" });
    if (expired(card)) throw Object.assign(new Error("That gift card has expired."), { status: 409, reason: "expired" });
    if (card.redeemedBy !== workspaceId) {
      throw Object.assign(new Error("That gift card has already been redeemed."), { status: 409, reason: "already_redeemed" });
    }
    // Falls through: this workspace already owns the claim, so finish the payout.
  }

  const { purchasedCredits } = await addPurchasedCredits(workspaceId, {
    sessionId: `gift:${card._id}`,
    packId: null,
    credits: card.credits,
    amountUsd: card.amountUsd,
  });

  return {
    credits: card.credits,
    amountUsd: card.amountUsd,
    purchasedCredits,
    replayed: !claimed,
  };
}

#!/usr/bin/env node
/**
 * Mint gift codes from the command line.
 *
 *   node scripts/gift-card.mjs                 # one $10 card
 *   node scripts/gift-card.mjs --usd 25 --count 5 --note "launch week"
 *   node scripts/gift-card.mjs --expires 2026-12-31
 *   node scripts/gift-card.mjs --list
 *
 * The codes print once. Nothing stores them in the clear, so if you lose the
 * output the only way back is to void the card and mint another.
 */

import "../src/config/env.js";
import mongoose from "mongoose";
import { connectDB } from "../src/core/database.js";
import GiftCard from "../src/models/giftCard.model.js";
import { issueGiftCards } from "../src/modules/billing/giftcard.service.js";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

await connectDB();

try {
  if (argv.includes("--list")) {
    const cards = await GiftCard.find({}).sort({ createdAt: -1 }).limit(50).lean();
    if (!cards.length) console.log("No gift cards issued yet.");
    for (const c of cards) {
      const when = c.redeemedAt ? ` on ${c.redeemedAt.toISOString().slice(0, 10)}` : "";
      console.log(
        `BBOX-••••-••••-${c.last4}  $${String(c.amountUsd).padStart(4)}  ${c.status.padEnd(8)}${when}` +
          (c.note ? `  — ${c.note}` : ""),
      );
    }
  } else {
    const cards = await issueGiftCards({
      amountUsd: Number(flag("usd", 10)),
      count: Number(flag("count", 1)),
      note: flag("note", null),
      batch: flag("batch", null),
      expiresAt: flag("expires", null),
      issuedBy: flag("by", "cli"),
    });

    console.log(`\n  ${cards.length} gift card${cards.length > 1 ? "s" : ""} — $${cards[0].amountUsd} each (${cards[0].credits.toLocaleString()} credits)\n`);
    for (const c of cards) console.log(`  ${c.code}`);
    console.log("\n  Copy these now — they are not stored and cannot be shown again.\n");
  }
} catch (err) {
  console.error(`\n  ${err.message}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

/**
 * Gift cards — a bearer instrument worth a fixed number of credits.
 *
 * The code itself is the only proof of ownership, so it is stored hashed and
 * shown exactly once, at issue time. A dump of this collection is worth
 * nothing: `last4` exists so a card can still be identified in a list, and
 * `redeem` looks a card up by hash rather than by anything printable.
 *
 * `credits` is snapshotted at issue time. The pay-as-you-go rate is allowed to
 * move, and a card promising "$10 of credits" must keep paying out what it was
 * worth when it was handed over.
 */

import mongoose from "mongoose";

const GiftCardSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, unique: true, index: true },
    last4: { type: String, required: true },

    credits: { type: Number, required: true, min: 1 },
    amountUsd: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["active", "redeemed", "void"],
      default: "active",
      index: true,
    },

    note: { type: String, default: null, maxlength: 200 },
    batch: { type: String, default: null, index: true },

    issuedBy: { type: String, required: true, index: true },
    expiresAt: { type: Date, default: null },

    redeemedBy: { type: String, default: null, index: true },
    redeemedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("GiftCard", GiftCardSchema);

/**
 * One-shot owner seeder for self-hosted installs.
 *
 * The installer runs this once, after the stack is healthy. The plaintext
 * password is generated *here*, inside the container, and leaves only on
 * stdout — it is never written to .env, never passed as an argv (visible in
 * `ps`), and never set as an environment variable (readable via /proc).
 *
 * stdout carries the password and nothing else, so the installer can capture
 * it with a plain command substitution. Everything human-readable goes to
 * stderr. Exit 3 means "an owner already exists" — a re-run must never mint a
 * second credential for an instance that is already claimed.
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { connectDB } from "../../core/database.js";
import User from "../../models/user.model.js";

// Ambiguous glyphs (0/O, 1/l/I) are omitted — this gets typed by hand off a
// terminal, and a misread character is indistinguishable from a wrong password.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LENGTH = 24;

const BOOTSTRAP_TTL_HOURS = 24;

function generatePassword() {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return out.match(/.{1,6}/g).join("-");
}

async function main() {
  const email = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("OWNER_EMAIL is missing or not a valid address.");
    process.exit(2);
  }

  await connectDB();

  const existing = await User.findOne({ isOwner: true }).select("_id email");
  if (existing) {
    console.error(`This instance is already claimed by ${existing.email}.`);
    console.error("To issue a fresh password, run:  docker compose exec backend node src/modules/selfhost/resetOwner.js");
    process.exit(3);
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 12);

  await User.create({
    name: email.split("@")[0],
    email,
    password: hashed,
    role: "admin",
    isOwner: true,
    // There is no SMTP on a fresh self-hosted box, so an unverified owner could
    // never complete a verification round-trip and would be locked out forever.
    emailVerified: true,
    mustChangePassword: true,
    bootstrapExpiresAt: new Date(Date.now() + BOOTSTRAP_TTL_HOURS * 3600 * 1000),
  });

  // stdout is a pipe when the installer captures this, and piped writes are
  // async — exiting without waiting for the flush truncates the password.
  await new Promise((resolve) => process.stdout.write(`${password}\n`, resolve));
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
}

main().catch(async (err) => {
  console.error(`Owner seed failed: ${err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});

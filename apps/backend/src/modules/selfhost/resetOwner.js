/**
 * Owner password recovery for self-hosted installs.
 *
 * There is no email-based reset on a self-hosted box — a fresh install has no
 * SMTP, and a reset link delivered nowhere is a lockout. Recovery is instead
 * gated on shell access to the host, which is a strictly stronger proof of
 * ownership than an inbox: anyone who can run this already controls the data.
 *
 * Same stdout contract as seedOwner.js — password on stdout, prose on stderr.
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { connectDB } from "../../core/database.js";
import User from "../../models/user.model.js";
import { redis, stripPrefix } from "../../infra/redis.client.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LENGTH = 24;
const BOOTSTRAP_TTL_HOURS = 24;

function generatePassword() {
  let out = "";
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  return out.match(/.{1,6}/g).join("-");
}

async function main() {
  await connectDB();

  const owner = await User.findOne({ isOwner: true });
  if (!owner) {
    console.error("No owner account exists yet. Run seedOwner.js first.");
    process.exit(3);
  }

  const password = generatePassword();
  owner.password = await bcrypt.hash(password, 12);
  owner.mustChangePassword = true;
  owner.bootstrapExpiresAt = new Date(Date.now() + BOOTSTRAP_TTL_HOURS * 3600 * 1000);
  await owner.save();

  // A password reset must not leave a pre-existing session usable, or a stolen
  // token would outlive the credential it was minted from.
  await redis.set(`bb:token-epoch:${owner._id}`, String(Date.now()), "EX", 30 * 24 * 3600).catch(() => {});
  // Lockouts are keyed per client IP, so clear the whole family — a reset must
  // not leave the owner locked out by whoever was guessing.
  // stripPrefix: ioredis prefixes what it sends but not what comes back, so
  // these results carry the tenant namespace and would double-prefix on del().
  const locks = stripPrefix(await redis.keys("auth:lockout:owner:*").catch(() => []));
  const fails = stripPrefix(await redis.keys("auth:fails:owner:*").catch(() => []));
  if (locks.length || fails.length) await redis.del(...locks, ...fails).catch(() => {});

  console.error(`Password reset for ${owner.email}.`);
  await new Promise((resolve) => process.stdout.write(`${password}\n`, resolve));
  await mongoose.connection.close().catch(() => {});
  await redis.quit().catch(() => {});
  process.exit(0);
}

main().catch(async (err) => {
  console.error(`Owner reset failed: ${err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});

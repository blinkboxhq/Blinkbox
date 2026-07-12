import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import nodeCrypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import RedisMock from "ioredis-mock";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const redis = new RedisMock();
const googlePayload = { current: null };
const noop = async () => {};

mock.module("../../infra/redis.client.js", { namedExports: { redis } });
mock.module("../../infra/email.service.js", {
  namedExports: {
    sendRegistrationEmail: noop,
    sendVerificationEmail: noop,
    sendWelcomeEmail: noop,
    sendPasswordResetEmail: noop,
    sendPasswordChangedEmail: noop,
    sendLoginAlertEmail: noop,
  },
});
mock.module("google-auth-library", {
  namedExports: {
    OAuth2Client: class {
      async verifyIdToken() {
        return { getPayload: () => googlePayload.current };
      }
    },
  },
});

const { login, loginTwoFactor, forgotPassword, googleLogin } = await import("./auth.controller.js");
const { default: User } = await import("../../models/user.model.js");
const { encrypt } = await import("../../utils/crypto.js");
const { generateSecret } = await import("../../utils/totp.js");

let mongod;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const mkReq = (body) => ({ body, headers: {}, ip: "127.0.0.1" });
const mkRes = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
};

function totpNow(secret, step = 30) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret) bits += A.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / step)));
  const h = nodeCrypto.createHmac("sha1", key).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6;
  return String(code).padStart(6, "0");
}

const makeUser = async (email, extra = {}) =>
  User.create({
    name: "T",
    email,
    password: await bcrypt.hash("correct-horse", 4),
    emailVerified: true,
    ...extra,
  });

test("forgotPassword returns {success:true} for unknown emails and leaves no reset token", async () => {
  const res = mkRes();
  await forgotPassword(mkReq({ email: "ghost@nowhere.dev" }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.deepEqual(await redis.keys("bb:reset:*"), []);

  const res2 = mkRes();
  await forgotPassword(mkReq({ email: "not-an-email" }), res2);
  assert.deepEqual(res2.body, { success: true });
});

test("login lockout activates on wrong password with 15s Redis TTL", async () => {
  await makeUser("lockme@test.dev");
  const res = mkRes();
  await login(mkReq({ email: "lockme@test.dev", password: "wrong" }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.lockoutTimer, 15);

  const ttl = await redis.ttl("auth:lockout:lockme@test.dev");
  assert.ok(ttl > 0 && ttl <= 15, `lockout TTL should be within (0,15], got ${ttl}`);

  const res2 = mkRes();
  await login(mkReq({ email: "lockme@test.dev", password: "correct-horse" }), res2);
  assert.equal(res2.statusCode, 429, "locked out even with the correct password");
  assert.ok(res2.body.lockoutTimer > 0);
});

test("2FA challenge has 300s TTL, expires, and cannot be reused", async () => {
  const secret = generateSecret();
  await makeUser("twofa@test.dev", {
    twoFactorEnabled: true,
    twoFactorSecret: encrypt(secret),
  });

  const res = mkRes();
  await login(mkReq({ email: "twofa@test.dev", password: "correct-horse" }), res);
  assert.equal(res.body.twoFactorRequired, true);
  const challenge = res.body.twoFactorToken;
  assert.ok(challenge);
  assert.equal(await redis.ttl(`bb:2fa:${challenge}`), 300);

  const ok = mkRes();
  await loginTwoFactor(mkReq({ twoFactorToken: challenge, code: totpNow(secret) }), ok);
  assert.equal(ok.statusCode, 200);
  assert.ok(ok.body.token, "expected a JWT after valid 2FA");

  const reuse = mkRes();
  await loginTwoFactor(mkReq({ twoFactorToken: challenge, code: totpNow(secret) }), reuse);
  assert.equal(reuse.statusCode, 401, "consumed challenge must not be reusable");

  const res2 = mkRes();
  await login(mkReq({ email: "twofa@test.dev", password: "correct-horse" }), res2);
  await redis.del(`bb:2fa:${res2.body.twoFactorToken}`);
  const expired = mkRes();
  await loginTwoFactor(
    mkReq({ twoFactorToken: res2.body.twoFactorToken, code: totpNow(secret) }),
    expired,
  );
  assert.equal(expired.statusCode, 401, "expired challenge must be rejected");
});

test("Google SSO rejects mismatched googleId on an existing account", async () => {
  await User.create({
    name: "G",
    email: "sso@test.dev",
    authProvider: "google",
    googleId: "google-id-A",
    emailVerified: true,
  });

  googlePayload.current = { sub: "google-id-B", email: "sso@test.dev", name: "G" };
  const res = mkRes();
  await googleLogin(mkReq({ credential: "fake-jwt" }), res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Google account mismatch/);

  googlePayload.current = { sub: "google-id-A", email: "sso@test.dev", name: "G" };
  const ok = mkRes();
  await googleLogin(mkReq({ credential: "fake-jwt" }), ok);
  assert.equal(ok.statusCode, 200);
  assert.ok(ok.body.token);
});

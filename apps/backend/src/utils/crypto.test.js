import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt } from "./crypto.js";

const KEY_A = "a".repeat(32);
const KEY_B = "b".repeat(32);

beforeEach(() => {
  process.env.ENCRYPTION_KEY = KEY_A;
});

test("encrypt→decrypt round-trip preserves UTF-8 and emoji", () => {
  const plaintext = "héllo wörld — ñandú 日本語 🎉🔐👨‍👩‍👧‍👦";
  const { encryptedData, iv, authTag } = encrypt(plaintext);

  assert.notEqual(encryptedData, plaintext);
  assert.match(iv, /^[0-9a-f]{32}$/);
  assert.match(authTag, /^[0-9a-f]{32}$/);
  assert.equal(decrypt(encryptedData, iv, authTag), plaintext);
});

test("round-trip preserves empty-adjacent and long strings", () => {
  const long = "🚀".repeat(5000) + "end";
  const enc = encrypt(long);
  assert.equal(decrypt(enc.encryptedData, enc.iv, enc.authTag), long);
});

test("tampered authTag throws", () => {
  const enc = encrypt("secret payload");
  const flipped =
    (enc.authTag[0] === "0" ? "1" : "0") + enc.authTag.slice(1);
  assert.throws(() => decrypt(enc.encryptedData, enc.iv, flipped));
});

test("tampered ciphertext throws", () => {
  const enc = encrypt("secret payload");
  const flipped =
    (enc.encryptedData[0] === "0" ? "1" : "0") + enc.encryptedData.slice(1);
  assert.throws(() => decrypt(flipped, enc.iv, enc.authTag));
});

test("decrypting with the wrong key throws", () => {
  const enc = encrypt("cross-key data");
  process.env.ENCRYPTION_KEY = KEY_B;
  assert.throws(() => decrypt(enc.encryptedData, enc.iv, enc.authTag));
});

test("missing ENCRYPTION_KEY throws at getMasterKey time", () => {
  delete process.env.ENCRYPTION_KEY;
  assert.throws(() => encrypt("x"), /ENCRYPTION_KEY must be exactly 32/);
});

test("short ENCRYPTION_KEY throws", () => {
  process.env.ENCRYPTION_KEY = "too-short";
  assert.throws(() => encrypt("x"), /ENCRYPTION_KEY must be exactly 32/);
  const enc = { encryptedData: "00", iv: "0".repeat(32), authTag: "0".repeat(32) };
  assert.throws(
    () => decrypt(enc.encryptedData, enc.iv, enc.authTag),
    /ENCRYPTION_KEY must be exactly 32/,
  );
});

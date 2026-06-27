import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  let bits = "";
  for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(secret) {
  const clean = secret.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "";
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

// Accept the current 30s window plus one step on either side to absorb clock drift.
export function verifyToken(token, secret, window = 1, step = 30) {
  if (!token || !secret) return false;
  const normalized = String(token).replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secret, counter + i);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(normalized))) {
      return true;
    }
  }
  return false;
}

export function keyuri(secret, accountName, issuer = "Blinkbox") {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

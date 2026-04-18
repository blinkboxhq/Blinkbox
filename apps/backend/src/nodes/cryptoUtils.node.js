/**
 * CRYPTO UTILS NODE
 * Hashing, HMAC signing, base64 encoding/decoding, UUID generation, and random tokens.
 *
 * Config:
 *   operation  — "hash" | "hmac" | "base64encode" | "base64decode" | "uuid" | "random"
 *   input      — string to process (hash / hmac / base64)
 *   algorithm  — hash: "md5"|"sha1"|"sha256"|"sha512" (default: sha256)
 *                hmac: same options
 *   secret     — HMAC secret key
 *   encoding   — output encoding: "hex" (default) | "base64" | "base64url"
 *   length     — bytes for "random" (default: 16)
 */

import crypto from "crypto";

export default {
  async run(config, input) {
    const {
      operation = "hash",
      algorithm = "sha256",
      secret,
      encoding = "hex",
      length = 16,
    } = config;

    const text = config.input ?? input?.text ?? input?.value ?? "";

    switch (operation) {
      case "hash": {
        const hash = crypto.createHash(algorithm).update(String(text)).digest(encoding === "base64url" ? "base64url" : encoding);
        return { hash, algorithm, encoding };
      }

      case "hmac": {
        if (!secret) throw new Error("Crypto Utils: 'secret' is required for HMAC.");
        const hmac = crypto.createHmac(algorithm, String(secret)).update(String(text)).digest(encoding === "base64url" ? "base64url" : encoding);
        return { hmac, algorithm, encoding };
      }

      case "base64encode": {
        const encoded = Buffer.from(String(text)).toString("base64");
        return { encoded, urlSafe: encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "") };
      }

      case "base64decode": {
        const decoded = Buffer.from(String(text), "base64").toString("utf8");
        return { decoded };
      }

      case "uuid": {
        return { uuid: crypto.randomUUID() };
      }

      case "random": {
        const bytes = crypto.randomBytes(Number(length));
        return { hex: bytes.toString("hex"), base64: bytes.toString("base64"), bytes: bytes.length };
      }

      default:
        throw new Error(`Crypto Utils: Unknown operation "${operation}". Valid: hash | hmac | base64encode | base64decode | uuid | random`);
    }
  },
};

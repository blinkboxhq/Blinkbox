/**
 * REDIS MEMORY NODE
 *
 * Persistent conversation memory backed by Redis. Stores messages as a
 * JSON-serialized array under a key derived from the session ID.
 *
 * On each execution:
 *   1. Fetches existing messages from Redis for this session
 *   2. Appends the new input message(s)
 *   3. Saves the updated array back to Redis (with optional TTL)
 *   4. Returns the full conversation history
 *
 * Config:
 *   sessionId    — Redis key suffix for this conversation
 *   credentialId — Credential containing the Redis connection URL
 *   ttl          — Time-to-live in seconds (0 = no expiry, default: 3600)
 *
 * Output:
 *   { messages: [{ role, content }, ...], sessionId, totalMessages }
 */

import Redis from "ioredis";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

// Key prefix to namespace memory keys and avoid collisions
const KEY_PREFIX = "blinkbox:memory:";

export default {
  async run(config, input, context = {}) {
    const { sessionId = "default", credentialId, ttl = 3600 } = config;

    // ── Resolve Redis connection URL ────────────────────────────────────
    if (!credentialId) {
      throw new Error("Redis Memory: 'credentialId' is required. Add a Redis credential.");
    }
    const cred = await resolveCredential(credentialId, context.workspaceId, "Redis");
    const redisUrl = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // ── Connect to Redis ────────────────────────────────────────────────
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const key = `${KEY_PREFIX}${sessionId}`;

      // ── Fetch existing messages ─────────────────────────────────────
      const raw = await redis.get(key);
      let messages = [];
      if (raw) {
        try {
          messages = JSON.parse(raw);
          if (!Array.isArray(messages)) messages = [];
        } catch {
          messages = [];
        }
      }

      // ── Normalize and append new input ──────────────────────────────
      const newMessages = normalizeInput(input);
      messages = messages.concat(newMessages);

      // ── Persist back to Redis ───────────────────────────────────────
      const serialized = JSON.stringify(messages);
      if (ttl > 0) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }

      return {
        messages,
        sessionId,
        totalMessages: messages.length,
      };
    } catch (err) {
      if (err.code === "ECONNREFUSED") {
        throw new Error(
          "Redis Memory: Connection refused. Check your Redis URL and ensure the server is running."
        );
      }
      throw new Error(`Redis Memory failed: ${err.message}`);
    } finally {
      // Always disconnect to prevent connection leaks
      redis.disconnect();
    }
  },
};

/**
 * Normalize any input shape into an array of { role, content } messages.
 */
function normalizeInput(input) {
  if (Array.isArray(input)) {
    return input
      .filter((m) => m && typeof m === "object" && m.role && m.content)
      .map((m) => ({ role: String(m.role), content: String(m.content) }));
  }
  if (input && typeof input === "object" && input.messages) {
    return normalizeInput(input.messages);
  }
  if (typeof input === "string" && input.trim()) {
    return [{ role: "user", content: input }];
  }
  if (input && typeof input === "object") {
    return [{ role: "user", content: JSON.stringify(input) }];
  }
  return [];
}

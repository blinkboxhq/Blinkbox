/**
 * REDIS NODE
 * Operations: get, set, del, exists, incr, decr, lpush, rpush, lrange,
 *             sadd, smembers, hset, hget, hgetall, expire, ttl, keys, publish
 * Auth: Redis URL in vault (redis://...) or inline host/port/password
 */

import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import IORedis from "ioredis";

const clients = new Map();

async function getClient(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Redis");
  const url  = decrypt(cred.encryptedData, cred.iv, cred.authTag);

  if (clients.has(url)) return clients.get(url);

  const client = new IORedis(url, {
    connectTimeout: 10000,
    lazyConnect: false,
    maxRetriesPerRequest: 2,
  });

  await new Promise((resolve, reject) => {
    client.once("ready", resolve);
    client.once("error", reject);
  });

  clients.set(url, client);
  return client;
}

function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("NOAUTH") || msg.includes("WRONGPASS")) throw new Error("Redis: Authentication failed. Check password.");
  if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) throw new Error(`Redis: Cannot connect — ${msg}`);
  if (msg.startsWith("Redis:")) throw err;
  throw new Error(`Redis: ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "get", key, value, ttl, field,
            members, start = 0, stop = -1, pattern = "*",
            channel, message } = config;

    let redis;
    try {
      redis = await getClient(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      if (operation === "get") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const result = await redis.get(key);
        let parsed = result;
        try { parsed = JSON.parse(result); } catch {}
        return { value: parsed, raw: result, key, found: result !== null };
      }

      if (operation === "set") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const stored = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        if (ttl) {
          await redis.set(key, stored, "EX", Number(ttl));
        } else {
          await redis.set(key, stored);
        }
        return { key, set: true, ttl: ttl ? Number(ttl) : null };
      }

      if (operation === "del") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const count = await redis.del(key);
        return { key, deleted: count > 0, count };
      }

      if (operation === "exists") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const count = await redis.exists(key);
        return { key, exists: count > 0 };
      }

      if (operation === "incr") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const newVal = await redis.incrby(key, Number(value || 1));
        return { key, value: newVal };
      }

      if (operation === "decr") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const newVal = await redis.decrby(key, Number(value || 1));
        return { key, value: newVal };
      }

      if (operation === "expire") {
        if (!key || !ttl) throw new Error("Redis: 'key' and 'ttl' are required.");
        const result = await redis.expire(key, Number(ttl));
        return { key, set: result === 1 };
      }

      if (operation === "ttl") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const result = await redis.ttl(key);
        return { key, ttl: result };
      }

      if (operation === "lpush") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const stored = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        const length = await redis.lpush(key, stored);
        return { key, length };
      }

      if (operation === "rpush") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const stored = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        const length = await redis.rpush(key, stored);
        return { key, length };
      }

      if (operation === "lrange") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const items = await redis.lrange(key, Number(start), Number(stop));
        const parsed = items.map(i => { try { return JSON.parse(i); } catch { return i; } });
        return { key, items: parsed, count: parsed.length };
      }

      if (operation === "sadd") {
        if (!key) throw new Error("Redis: 'key' is required.");
        let ms = members;
        if (typeof ms === "string") { try { ms = JSON.parse(ms); } catch {} }
        if (!Array.isArray(ms)) ms = [ms];
        const added = await redis.sadd(key, ...ms);
        return { key, added };
      }

      if (operation === "smembers") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const result = await redis.smembers(key);
        return { key, members: result, count: result.length };
      }

      if (operation === "hset") {
        if (!key || !field) throw new Error("Redis: 'key' and 'field' are required.");
        const stored = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        await redis.hset(key, field, stored);
        return { key, field, set: true };
      }

      if (operation === "hget") {
        if (!key || !field) throw new Error("Redis: 'key' and 'field' are required.");
        const result = await redis.hget(key, field);
        let parsed = result;
        try { parsed = JSON.parse(result); } catch {}
        return { key, field, value: parsed, found: result !== null };
      }

      if (operation === "hgetall") {
        if (!key) throw new Error("Redis: 'key' is required.");
        const result = await redis.hgetall(key);
        const parsed = {};
        for (const [k, v] of Object.entries(result ?? {})) {
          try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
        }
        return { key, hash: parsed, fieldCount: Object.keys(parsed).length };
      }

      if (operation === "keys") {
        const result = await redis.keys(pattern);
        return { keys: result, count: result.length, pattern };
      }

      if (operation === "publish") {
        if (!channel) throw new Error("Redis: 'channel' is required.");
        const stored = typeof message === "object" ? JSON.stringify(message) : String(message ?? "");
        const receivers = await redis.publish(channel, stored);
        return { channel, receivers };
      }

      throw new Error(`Redis: Unknown operation '${operation}'.`);
    } catch (err) {
      handleError(err);
    }
  },
};

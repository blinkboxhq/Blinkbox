/**
 * REDIS — Hash & Pub/Sub resource. hset / hget / hgetall / publish preserved
 * verbatim from the monolith; hdel, hkeys, hvals, hincrby, hexists, hmset added
 * for parity. Handlers receive (config, redis).
 */
import { stringify, tryParse } from "../GenericFunctions.js";

async function opHset(config, redis) {
  const { key, field, value } = config;
  if (!key || !field) return { success: false, error: "Redis: 'key' and 'field' are required.", skipped: true };
  await redis.hset(key, field, stringify(value));
  return { key, field, set: true };
}

async function opHget(config, redis) {
  const { key, field } = config;
  if (!key || !field) return { success: false, error: "Redis: 'key' and 'field' are required.", skipped: true };
  const result = await redis.hget(key, field);
  return { key, field, value: tryParse(result), found: result !== null };
}

async function opHgetall(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.hgetall(key);
  const parsed = {};
  for (const [k, v] of Object.entries(result ?? {})) {
    parsed[k] = tryParse(v);
  }
  return { key, hash: parsed, fieldCount: Object.keys(parsed).length };
}

async function opPublish(config, redis) {
  const { channel, message } = config;
  if (!channel) return { success: false, error: "Redis: 'channel' is required.", skipped: true };
  const stored = stringify(message);
  const receivers = await redis.publish(channel, stored);
  return { channel, receivers };
}

async function opHdel(config, redis) {
  const { key, field } = config;
  if (!key || !field) return { success: false, error: "Redis: 'key' and 'field' are required.", skipped: true };
  const removed = await redis.hdel(key, field);
  return { key, field, removed: removed > 0, count: removed };
}

async function opHkeys(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const fields = await redis.hkeys(key);
  return { key, fields, count: fields.length };
}

async function opHvals(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const values = await redis.hvals(key);
  return { key, values: values.map((v) => tryParse(v)), count: values.length };
}

async function opHincrby(config, redis) {
  const { key, field, value } = config;
  if (!key || !field) return { success: false, error: "Redis: 'key' and 'field' are required.", skipped: true };
  const result = await redis.hincrby(key, field, Number(value || 1));
  return { key, field, value: result };
}

async function opHexists(config, redis) {
  const { key, field } = config;
  if (!key || !field) return { success: false, error: "Redis: 'key' and 'field' are required.", skipped: true };
  const result = await redis.hexists(key, field);
  return { key, field, exists: result === 1 };
}

async function opHmset(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  let fields = config.fields;
  if (typeof fields === "string") { try { fields = JSON.parse(fields); } catch { fields = null; } }
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return { success: false, error: "Redis: 'fields' object required.", skipped: true };
  const flat = [];
  for (const [f, v] of Object.entries(fields)) { flat.push(f, stringify(v)); }
  if (flat.length === 0) return { success: false, error: "Redis: 'fields' object required.", skipped: true };
  await redis.hset(key, ...flat);
  return { key, set: true, fieldCount: flat.length / 2 };
}

export const hashPubOperations = {
  hset: opHset,
  hget: opHget,
  hgetall: opHgetall,
  publish: opPublish,
  hdel: opHdel,
  hkeys: opHkeys,
  hvals: opHvals,
  hincrby: opHincrby,
  hexists: opHexists,
  hmset: opHmset,
};

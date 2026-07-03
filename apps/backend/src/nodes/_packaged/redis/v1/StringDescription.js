/**
 * REDIS — String, Numeric & Key resource. get / set / del / exists / incr /
 * decr / expire / ttl / keys preserved verbatim from the monolith; mget, mset,
 * setnx, append, getset, type, rename, persist, ping added for parity.
 * Handlers receive (config, redis).
 */
import { stringify, tryParse } from "../GenericFunctions.js";

async function opGet(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.get(key);
  return { value: tryParse(result), raw: result, key, found: result !== null };
}

async function opSet(config, redis) {
  const { key, value, ttl } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const stored = stringify(value);
  if (ttl) await redis.set(key, stored, "EX", Number(ttl));
  else await redis.set(key, stored);
  return { key, set: true, ttl: ttl ? Number(ttl) : null };
}

async function opDel(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const count = await redis.del(key);
  return { key, deleted: count > 0, count };
}

async function opExists(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const count = await redis.exists(key);
  return { key, exists: count > 0 };
}

async function opIncr(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const newVal = await redis.incrby(key, Number(value || 1));
  return { key, value: newVal };
}

async function opDecr(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const newVal = await redis.decrby(key, Number(value || 1));
  return { key, value: newVal };
}

async function opExpire(config, redis) {
  const { key, ttl } = config;
  if (!key || !ttl) return { success: false, error: "Redis: 'key' and 'ttl' are required.", skipped: true };
  const result = await redis.expire(key, Number(ttl));
  return { key, set: result === 1 };
}

async function opTtl(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.ttl(key);
  return { key, ttl: result };
}

async function opKeys(config, redis) {
  const pattern = config.pattern ?? "*";
  const result = await redis.keys(pattern);
  return { keys: result, count: result.length, pattern };
}

async function opMget(config, redis) {
  let keys = config.keys;
  if (typeof keys === "string") { try { keys = JSON.parse(keys); } catch { keys = keys.split(",").map((k) => k.trim()); } }
  if (!Array.isArray(keys) || keys.length === 0) return { success: false, error: "Redis: 'keys' must be a non-empty array.", skipped: true };
  const results = await redis.mget(...keys);
  const map = {};
  keys.forEach((k, i) => { map[k] = tryParse(results[i]); });
  return { values: map, count: keys.length };
}

async function opMset(config, redis) {
  let pairs = config.pairs;
  if (typeof pairs === "string") { try { pairs = JSON.parse(pairs); } catch { pairs = null; } }
  if (!pairs || typeof pairs !== "object" || Array.isArray(pairs)) return { success: false, error: "Redis: 'pairs' object required.", skipped: true };
  const flat = [];
  for (const [k, v] of Object.entries(pairs)) { flat.push(k, stringify(v)); }
  if (flat.length === 0) return { success: false, error: "Redis: 'pairs' object required.", skipped: true };
  await redis.mset(...flat);
  return { set: true, count: flat.length / 2 };
}

async function opSetnx(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.setnx(key, stringify(value));
  return { key, set: result === 1 };
}

async function opAppend(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const length = await redis.append(key, stringify(value));
  return { key, length };
}

async function opGetset(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const previous = await redis.getset(key, stringify(value));
  return { key, previous: tryParse(previous), set: true };
}

async function opType(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const type = await redis.type(key);
  return { key, type };
}

async function opRename(config, redis) {
  const { key, newKey } = config;
  if (!key || !newKey) return { success: false, error: "Redis: 'key' and 'newKey' are required.", skipped: true };
  await redis.rename(key, newKey);
  return { renamed: true, from: key, to: newKey };
}

async function opPersist(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.persist(key);
  return { key, persisted: result === 1 };
}

async function opPing(config, redis) {
  const result = await redis.ping();
  return { pong: result };
}

export const stringOperations = {
  get: opGet,
  set: opSet,
  del: opDel,
  exists: opExists,
  incr: opIncr,
  decr: opDecr,
  expire: opExpire,
  ttl: opTtl,
  keys: opKeys,
  mget: opMget,
  mset: opMset,
  setnx: opSetnx,
  append: opAppend,
  getset: opGetset,
  type: opType,
  rename: opRename,
  persist: opPersist,
  ping: opPing,
};

/**
 * REDIS — List, Set & Sorted-Set resource. lpush / rpush / lrange / sadd /
 * smembers preserved verbatim from the monolith; llen, lpop, rpop, srem,
 * sismember, scard, zadd, zrange, zscore added for parity. Handlers receive
 * (config, redis).
 */
import { stringify, tryParse } from "../GenericFunctions.js";

async function opLpush(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const length = await redis.lpush(key, stringify(value));
  return { key, length };
}

async function opRpush(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const length = await redis.rpush(key, stringify(value));
  return { key, length };
}

async function opLrange(config, redis) {
  const { key, start = 0, stop = -1 } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const items = await redis.lrange(key, Number(start), Number(stop));
  const parsed = items.map((i) => tryParse(i));
  return { key, items: parsed, count: parsed.length };
}

async function opSadd(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  let ms = config.members;
  if (typeof ms === "string") { try { ms = JSON.parse(ms); } catch {} }
  if (!Array.isArray(ms)) ms = [ms];
  const added = await redis.sadd(key, ...ms);
  return { key, added };
}

async function opSmembers(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.smembers(key);
  return { key, members: result, count: result.length };
}

async function opLlen(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const length = await redis.llen(key);
  return { key, length };
}

async function opLpop(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.lpop(key);
  return { key, value: tryParse(result), found: result !== null };
}

async function opRpop(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.rpop(key);
  return { key, value: tryParse(result), found: result !== null };
}

async function opSrem(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  let ms = config.members;
  if (typeof ms === "string") { try { ms = JSON.parse(ms); } catch {} }
  if (!Array.isArray(ms)) ms = [ms];
  const removed = await redis.srem(key, ...ms);
  return { key, removed };
}

async function opSismember(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const result = await redis.sismember(key, stringify(value));
  return { key, isMember: result === 1 };
}

async function opScard(config, redis) {
  const { key } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const count = await redis.scard(key);
  return { key, count };
}

async function opZadd(config, redis) {
  const { key, score, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  if (score === undefined || score === null || score === "") return { success: false, error: "Redis: 'score' is required.", skipped: true };
  const added = await redis.zadd(key, Number(score), stringify(value));
  return { key, added };
}

async function opZrange(config, redis) {
  const { key, start = 0, stop = -1 } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const withScores = config.withScores === true || config.withScores === "true";
  const args = withScores ? [Number(start), Number(stop), "WITHSCORES"] : [Number(start), Number(stop)];
  const items = await redis.zrange(key, ...args);
  return { key, items, count: items.length, withScores };
}

async function opZscore(config, redis) {
  const { key, value } = config;
  if (!key) return { success: false, error: "Redis: 'key' is required.", skipped: true };
  const score = await redis.zscore(key, stringify(value));
  return { key, score: score === null ? null : Number(score), found: score !== null };
}

export const collectionOperations = {
  lpush: opLpush,
  rpush: opRpush,
  lrange: opLrange,
  sadd: opSadd,
  smembers: opSmembers,
  llen: opLlen,
  lpop: opLpop,
  rpop: opRpop,
  srem: opSrem,
  sismember: opSismember,
  scard: opScard,
  zadd: opZadd,
  zrange: opZrange,
  zscore: opZscore,
};

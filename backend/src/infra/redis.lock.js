import { redis } from "./redis.client.js";

export async function acquireLock(key, ttlSeconds = 30) {
  const result = await redis.set(key, "locked", "NX", "EX", ttlSeconds);
  return result === "OK";
}

export async function releaseLock(key) {
  await redis.del(key);
}

import { redis } from "./redis.client.js";

const releaseScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

const renewScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("expire", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

export async function acquireLock(key, ownerId, ttlSeconds = 30) {
  const result = await redis.set(key, ownerId, "NX", "EX", ttlSeconds);
  return result === "OK";
}

export async function renewLock(key, ownerId, ttlSeconds = 30) {
  const result = await redis.eval(renewScript, 1, key, ownerId, ttlSeconds);
  return result === 1;
}

export async function releaseLock(key, ownerId) {
  await redis.eval(releaseScript, 1, key, ownerId);
}

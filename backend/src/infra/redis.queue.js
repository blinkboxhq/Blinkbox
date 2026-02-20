import { redis } from "./redis.client.js"; // default import

export const redisQueue = {
  async lpush(key, value) {
    return redis.lpush(key, value);
  },

  async brpop(key, timeout = 0) {
    return redis.brpop(key, timeout);
  },
};

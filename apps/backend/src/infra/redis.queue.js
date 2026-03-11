import { redis } from "./redis.client.js";

const CURSOR_QUEUE = "bb:queue:execute";

export const redisQueue = {
  // Push a job onto the queue (used by the API / executor)
  async lpush(key, value) {
    return redis.lpush(key, value);
  },

  // Non-blocking pop (used by in-process workers)
  // Returns null if the queue is empty — worker loop handles the sleep.
  async rpop(key) {
    return redis.rpop(key);
  },
};

import { redisQueue } from "../../infra/redis.queue.js";

const CURSOR_QUEUE = "cursor:execute";

export async function enqueueCursor(payload) {
  await redisQueue.lpush(CURSOR_QUEUE, JSON.stringify(payload));
}

export async function dequeueCursor() {
  const [, raw] = await redisQueue.brpop(CURSOR_QUEUE, 0);
  return JSON.parse(raw);
}

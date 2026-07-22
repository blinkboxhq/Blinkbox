/**
 * Delay Scheduler — Redis Sorted Sets (ZADD)
 *
 * Replaces the MongoDB polling (setInterval every 5s) approach for delay nodes.
 * Uses Redis ZADD with the Unix timestamp as score for O(log N) scheduling.
 *
 * Flow:
 *   1. Executor calls scheduleDelay(payload, timestamp) → ZADD
 *   2. Scheduler polls every 1s with ZRANGEBYSCORE for due cursors
 *   3. Atomically removes (ZREM) and enqueues to BullMQ
 */

import { redis } from "./redis.client.js";
import { getCursorQueue } from "./bullmq.js";

const DELAY_SET = "bb:delay:cursors";
const POLL_INTERVAL_MS = 1000;

let intervalId = null;

/**
 * Schedule a cursor to resume at a specific Unix timestamp.
 * @param {Object} payload - { executionId, cursorId }
 * @param {number} resumeAtMs - Unix timestamp in milliseconds
 */
export async function scheduleDelay(payload, resumeAtMs) {
  const member = JSON.stringify(payload);
  await redis.zadd(DELAY_SET, resumeAtMs, member);
}

/**
 * Start the delay scheduler loop.
 * Checks Redis sorted set every second for due cursors and promotes them to BullMQ.
 */
export function startDelayScheduler() {
  console.log("[DelayScheduler] Started (Redis Sorted Sets, 1s poll)");

  intervalId = setInterval(async () => {
    try {
      const now = Date.now();

      // ZRANGEBYSCORE: Get all members with score <= now (due for execution)
      const dueMembers = await redis.zrangebyscore(DELAY_SET, 0, now);
      if (dueMembers.length === 0) return;

      for (const member of dueMembers) {
        // Atomic remove: only one scheduler instance can claim this cursor
        const removed = await redis.zrem(DELAY_SET, member);
        if (removed === 0) continue; // Another instance already claimed it

        const payload = JSON.parse(member);

        // Promote to BullMQ for immediate processing
        await getCursorQueue().add("process-cursor", payload);
        console.log(`[DelayScheduler] Promoted cursor ${payload.cursorId}`);
      }
    } catch (err) {
      console.error("[DelayScheduler] Error:", err.message);
    }
  }, POLL_INTERVAL_MS);
}

export function stopDelayScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

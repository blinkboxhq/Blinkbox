/**
 * Execution Resumer — Crash Recovery Only
 *
 * With BullMQ handling job delivery and stalled detection, and the Redis ZADD
 * delay scheduler handling delayed cursors, the resumer's role is now limited to:
 *
 *   1. Recover cursors stuck in "running" state in MongoDB for >90s
 *      (edge case: cursor was marked "running" in Mongo but the BullMQ job
 *       was already removed — BullMQ stalled detection won't catch this)
 *
 * The delay wake-up logic is GONE — it's handled by delay.scheduler.js (ZADD).
 */

import Execution from "../../models/execution.model.js";
import { enqueueCursor } from "./cursor.queue.js";
import { redis } from "../../infra/redis.client.js";

const STALE_MS = 90 * 1000; // Must exceed BullMQ lockDuration (90s)
const RESUMER_INTERVAL_MS = 10000; // Check every 10s (less aggressive than old 5s)

let intervalId = null;

export function startExecutionResumer() {
  console.log("[Resumer] Started (crash recovery, 10s interval)");

  intervalId = setInterval(async () => {
    // Prevent overlapping resumer runs across instances
    const acquired = await redis.set("bb:lock:resumer", "1", "NX", "EX", 15);
    if (!acquired) return;

    try {
      const stale = new Date(Date.now() - STALE_MS);

      // Find cursors stuck in "running" with a stale lock (batch of 100 per cycle)
      const crashedExecutions = await Execution.find({
        "cursors.status": "running",
        "cursors.lockedAt": { $lte: stale },
      }).limit(100);

      for (const execution of crashedExecutions) {
        let modified = false;
        const toEnqueue = [];

        for (const cursor of execution.cursors) {
          if (cursor.status === "running" && cursor.lockedAt && cursor.lockedAt <= stale) {
            console.log(`[Resumer] Recovering crashed cursor: ${cursor._id}`);
            cursor.status = "pending";
            cursor.lockedAt = null;
            cursor.lockedBy = null;
            modified = true;
            toEnqueue.push({
              executionId: execution._id.toString(),
              cursorId: cursor._id.toString(),
            });
          }
        }

        if (modified) {
          // Save to MongoDB FIRST, then enqueue (prevents orphaned queue entries)
          await execution.save();
          for (const job of toEnqueue) {
            await enqueueCursor(job);
          }
        }
      }
      // Recover "waiting" cursors whose Redis ZADD entry was lost (e.g. Redis restart)
      const staleWaiting = new Date(Date.now() - 5 * 60 * 1000);
      const stuckWaitingExecutions = await Execution.find({
        status: { $in: ["pending", "running"] },
        "cursors.status": "waiting",
        "cursors.lockedAt": null,
        updatedAt: { $lte: staleWaiting },
      }).limit(100);

      for (const execution of stuckWaitingExecutions) {
        let modified = false;
        const toEnqueue = [];

        for (const cursor of execution.cursors) {
          if (cursor.status === "waiting") {
            console.log(`[Resumer] Recovering stuck waiting cursor: ${cursor._id}`);
            cursor.status = "pending";
            modified = true;
            toEnqueue.push({
              executionId: execution._id.toString(),
              cursorId: cursor._id.toString(),
            });
          }
        }

        if (modified) {
          await execution.save();
          for (const job of toEnqueue) {
            await enqueueCursor(job);
          }
        }
      }
    } catch (err) {
      console.error("[Resumer] Error:", err.message);
    } finally {
      await redis.del("bb:lock:resumer");
    }
  }, RESUMER_INTERVAL_MS);
}

export function stopExecutionResumer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

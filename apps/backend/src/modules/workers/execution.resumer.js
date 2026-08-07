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

// Must comfortably exceed BullMQ lockDuration (300s). Reclaiming a cursor that is
// still alive restarts its node, and for an agent node that means a second full
// model run — so the bar for declaring a cursor dead is deliberately high.
const STALE_MS = 600 * 1000;
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
      // Recover "pending" cursors whose queue job was lost — an enqueue that lands
      // while the workers are restarting leaves the cursor unclaimed forever, since
      // nothing else re-delivers it. The executor's claim is atomic, so a duplicate
      // job simply loses the race and returns.
      const stuckPendingExecutions = await Execution.find({
        status: { $in: ["pending", "running"] },
        cursors: { $elemMatch: { status: "pending", lockedAt: null } },
        updatedAt: { $lte: stale },
      }).limit(100);

      for (const execution of stuckPendingExecutions) {
        for (const cursor of execution.cursors) {
          if (cursor.status === "pending" && !cursor.lockedAt) {
            console.log(`[Resumer] Re-enqueuing stranded pending cursor: ${cursor._id}`);
            await enqueueCursor({
              executionId: execution._id.toString(),
              cursorId: cursor._id.toString(),
            });
          }
        }
      }

      // Recover "waiting" cursors whose Redis ZADD entry was lost (e.g. Redis restart)
      const staleWaiting = new Date(Date.now() - 5 * 60 * 1000);
      const stuckWaitingExecutions = await Execution.find({
        status: { $in: ["pending", "running"] },
        cursors: {
          $elemMatch: {
            status: "waiting",
            lockedAt: null,
            waitingForWebhook: { $ne: true },
          },
        },
        updatedAt: { $lte: staleWaiting },
      }).limit(100);

      for (const execution of stuckWaitingExecutions) {
        let modified = false;
        const toEnqueue = [];

        for (const cursor of execution.cursors) {
          if (cursor.status === "waiting" && !cursor.waitingForWebhook) {
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
      // Finalize executions whose cursors are all terminal but whose status was
      // never flipped. In-executor finalization runs on the last cursor to
      // finish, so a crash or a lost save between the two leaves the run
      // "running" forever — visible to the user as a job that never ends.
      const unfinalized = await Execution.find({
        status: { $in: ["pending", "running"] },
        updatedAt: { $lte: stale },
        "cursors.status": { $nin: ["pending", "running", "waiting"] },
      }).limit(100);

      for (const execution of unfinalized) {
        if (!execution.cursors.length) continue;
        console.log(`[Resumer] Finalizing orphaned execution: ${execution._id}`);
        execution.status = execution.cursors.some((c) => c.status === "failed")
          ? "failed"
          : execution.cursors.some((c) => c.status === "skipped")
            ? "partial"
            : "executed";
        execution.completedAt = new Date();
        await execution.save();
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

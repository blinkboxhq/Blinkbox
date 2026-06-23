/**
 * Cursor Worker — BullMQ Edition
 *
 * Replaces 4 async polling loops with a single BullMQ Worker.
 * BullMQ handles: concurrency, stalled job detection, graceful shutdown.
 *
 * Architecture:
 *   - concurrency: 4 (same as old NUM_CONCURRENT)
 *   - stalledInterval: 30s (detects stuck jobs)
 *   - lockDuration: 90s — BullMQ auto-renews while the job runs, so unlimited-time nodes (aiAgent) stay safe
 *   - Failed jobs are moved to dead-letter queue for operator inspection
 */

import { Worker } from "bullmq";
import { createBullMQConnection, cursorQueue, deadLetterQueue } from "../../infra/bullmq.js";
import { processCursor } from "./cursor.executor.js";
import { redis } from "../../infra/redis.client.js";

const NUM_CONCURRENT = 4;
let worker = null;

export async function startCursorWorker() {
  console.log(`[Engine] Starting BullMQ cursor worker (concurrency: ${NUM_CONCURRENT})...`);

  // Clear any stale kill switches from previous runs
  await redis.del("bb:locks:global_kill_switch");

  worker = new Worker(
    "bb-cursor-execute",
    async (job) => {
      // Kill switch check: if active, delay and re-queue
      const isKilled = await redis.get("bb:locks:global_kill_switch");
      if (isKilled) {
        await cursorQueue.add("process-cursor", job.data, { delay: 5000 });
        return; // Complete this job silently, the re-queued one will run later
      }

      await processCursor(job.data);
    },
    {
      connection: createBullMQConnection(),
      concurrency: NUM_CONCURRENT,
      stalledInterval: 30000,   // Check for stalled jobs every 30s
      maxStalledCount: 2,       // Re-attempt stalled jobs up to 2 times
      lockDuration: 90000,      // Auto-renewed by BullMQ while the job runs — does NOT cap node runtime
    },
  );

  worker.on("failed", async (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);

    // Move to dead-letter queue for inspection and possible replay
    if (job) {
      await deadLetterQueue.add("dead-cursor", {
        ...job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        originalJobId: job.id,
      });
    }
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[BullMQ] Job ${jobId} stalled — auto-retrying`);
  });

  worker.on("error", (err) => {
    // Connection errors, etc. BullMQ auto-reconnects.
    console.error("[BullMQ Worker] Error:", err.message);
  });

  console.log("[Engine] BullMQ worker ready. Processing cursors...");
  return true;
}

export async function stopCursorWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

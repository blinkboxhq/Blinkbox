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

import { Worker } from "../../infra/bullmq.prefixed.js";
import { createBullMQConnection, getCursorQueue, getDeadLetterQueue } from "../../infra/bullmq.js";
import { processCursor } from "./cursor.executor.js";
import { redis } from "../../infra/redis.client.js";
import { CURSOR_CONCURRENCY } from "../../config/env.js";
import { isDbFullError } from "../../utils/dbErrors.js";
import { dbIsFull } from "../../infra/dbHealth.js";

// While MongoDB is full a cursor can't even claim itself, so failing the job
// would only park it in the dead-letter queue. Wait and try again instead,
// for up to DB_FULL_MAX_WAITS * DB_FULL_WAIT_MS (2 hours).
const DB_FULL_WAIT_MS = 10 * 60 * 1000;
const DB_FULL_MAX_WAITS = 12;

// Nothing consumes the dead-letter queue, so keep it from growing forever.
const DEAD_LETTER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEAD_LETTER_TRIM_EVERY_MS = 10 * 60 * 1000;
let lastDeadLetterTrim = 0;

export async function runCursorJob(data, {
  process = processCursor,
  requeue = (next, delay) => getCursorQueue().add("process-cursor", next, { delay }),
  isFull = dbIsFull,
} = {}) {
  try {
    await process(data);
  } catch (err) {
    const waits = data.dbFullWaits || 0;
    if ((isDbFullError(err) || isFull()) && waits < DB_FULL_MAX_WAITS) {
      await requeue({ ...data, dbFullWaits: waits + 1 }, DB_FULL_WAIT_MS);
      if (waits === 0) console.warn(`[BullMQ] Cursor ${data.cursorId} is waiting for database space before it can run.`);
      return "waiting";
    }
    throw err;
  }
  return "done";
}

const NUM_CONCURRENT = CURSOR_CONCURRENCY;
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
        await getCursorQueue().add("process-cursor", job.data, { delay: 5000 });
        return; // Complete this job silently, the re-queued one will run later
      }

      await runCursorJob(job.data);
    },
    {
      connection: createBullMQConnection(),
      concurrency: NUM_CONCURRENT,
      stalledInterval: 60000,   // Check for stalled jobs every 60s
      maxStalledCount: 1,       // Re-attempt a stalled job once — agent nodes are expensive to repeat
      // Auto-renewed by BullMQ while the job runs, but renewal needs the event loop.
      // Several concurrent agent nodes serializing large payloads can block it for
      // tens of seconds, so keep the lock far longer than any plausible stall.
      lockDuration: 300000,
    },
  );

  worker.on("failed", async (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);

    // Move to dead-letter queue for inspection and possible replay
    if (!job) return;
    try {
      const dlq = getDeadLetterQueue();
      await dlq.add("dead-cursor", {
        ...job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        originalJobId: job.id,
      });
      if (Date.now() - lastDeadLetterTrim > DEAD_LETTER_TRIM_EVERY_MS) {
        lastDeadLetterTrim = Date.now();
        await dlq.clean(DEAD_LETTER_MAX_AGE_MS, 5000, "wait");
      }
    } catch (dlqErr) {
      console.error("[BullMQ] Could not record dead-letter job:", dlqErr.message);
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

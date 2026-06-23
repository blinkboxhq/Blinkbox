/**
 * Payload Flusher — Redis → MongoDB Background Drain
 *
 * Periodically scans for completed workflow payloads sitting in Redis and
 * bulk-writes them into the MongoDB payload_blobs collection for long-term
 * audit and replay. After flushing, the Redis keys are deleted.
 *
 * This decouples the hot execution path (Redis-only writes) from the cold
 * storage path (MongoDB batch inserts), keeping Temporal history tiny and
 * preventing MongoDB I/O from blocking DAG traversal.
 *
 * Schedule: Every 60 seconds (configurable via PAYLOAD_FLUSH_INTERVAL_MS).
 * Each cycle processes up to MAX_WORKFLOWS_PER_CYCLE workflows to avoid
 * Redis SCAN storms on large deployments.
 */

import {
  flushWorkflowPayloads,
  getPendingWorkflowIds,
} from "../temporal/payloadStore.js";

const FLUSH_INTERVAL_MS = parseInt(
  process.env.PAYLOAD_FLUSH_INTERVAL_MS || "60000",
  10,
);
const MAX_WORKFLOWS_PER_CYCLE = 50;

let timer = null;

export function startPayloadFlusher() {
  console.log(
    `[PayloadFlusher] Starting (interval: ${FLUSH_INTERVAL_MS / 1000}s, batch: ${MAX_WORKFLOWS_PER_CYCLE})`,
  );

  timer = setInterval(runFlushCycle, FLUSH_INTERVAL_MS);

  // Run the first cycle after a short delay to let the system stabilize
  setTimeout(runFlushCycle, 5000);
}

async function runFlushCycle() {
  try {
    const workflowIds = await getPendingWorkflowIds();
    if (workflowIds.length === 0) return;

    const batch = workflowIds.slice(0, MAX_WORKFLOWS_PER_CYCLE);
    let totalFlushed = 0;

    for (const workflowId of batch) {
      try {
        const flushed = await flushWorkflowPayloads(workflowId);
        totalFlushed += flushed;
      } catch (err) {
        console.error(
          `[PayloadFlusher] Failed to flush workflow ${workflowId}:`,
          err.message,
        );
        // Continue with next workflow — don't let one failure block the batch
      }
    }

    if (totalFlushed > 0) {
      console.log(
        `[PayloadFlusher] Flushed ${totalFlushed} payloads from ${batch.length} workflows`,
      );
    }

    if (workflowIds.length > MAX_WORKFLOWS_PER_CYCLE) {
      console.log(
        `[PayloadFlusher] ${workflowIds.length - MAX_WORKFLOWS_PER_CYCLE} workflows deferred to next cycle`,
      );
    }
  } catch (err) {
    console.error("[PayloadFlusher] Cycle error:", err.message);
  }
}

export function stopPayloadFlusher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

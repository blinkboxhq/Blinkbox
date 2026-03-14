/**
 * Telemetry Flusher — Background job that drains the Redis telemetry queue
 * and bulk-inserts logs into MongoDB (simulating an OLAP ingestion pipeline).
 *
 * Runs every 5 seconds, pops up to 1,000 logs per tick.
 * When the ClickHouse migration happens, swap ExecutionLog.insertMany()
 * for a ClickHouse batch INSERT — everything else stays the same.
 */

import { redis } from "../../infra/redis.client.js";
import ExecutionLog from "../../models/executionLog.model.js";
import { TELEMETRY_QUEUE_KEY } from "./telemetry.service.js";
import type { TelemetryLog } from "./telemetry.service.js";

const FLUSH_INTERVAL_MS = 5_000;
const BATCH_SIZE = 1_000;

let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Pop up to BATCH_SIZE logs from Redis and bulk-insert into MongoDB.
 * Uses a pipeline of LPOP commands for atomic, efficient draining.
 */
async function flush(): Promise<void> {
  try {
    // Atomic batch pop via Redis pipeline
    const pipeline = redis.pipeline();
    for (let i = 0; i < BATCH_SIZE; i++) {
      pipeline.lpop(TELEMETRY_QUEUE_KEY);
    }
    const results = await pipeline.exec();

    if (!results) return;

    // Filter out null pops (queue had fewer than BATCH_SIZE entries)
    const docs: TelemetryLog[] = [];
    for (const [err, raw] of results) {
      if (err || raw === null) continue;
      try {
        docs.push(JSON.parse(raw as string));
      } catch {
        // Skip malformed entries
      }
    }

    if (docs.length === 0) return;

    // Bulk insert — ordered: false allows partial success on duplicate/error
    await ExecutionLog.insertMany(docs, { ordered: false });

    if (docs.length >= BATCH_SIZE) {
      // Queue might have more — flush again immediately
      setImmediate(flush);
    }
  } catch (err) {
    const error = err as Error;
    console.error("[TelemetryFlusher] Flush error:", error.message);
  }
}

export function startTelemetryFlusher(): void {
  if (flushTimer) return;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  console.log(
    `Telemetry flusher started (every ${FLUSH_INTERVAL_MS / 1000}s, batch ${BATCH_SIZE})`,
  );
}

export function stopTelemetryFlusher(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

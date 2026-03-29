/**
 * PayloadStore — Two-Tier Storage for Node Outputs
 *
 * Tier 1 (Hot): Redis — sub-millisecond reads during DAG traversal.
 *   Payloads above INLINE_THRESHOLD_BYTES are stored in Redis with a 24h TTL.
 *   Key format: bb:payload:<id>
 *
 * Tier 2 (Cold): MongoDB — long-term logging via background flush.
 *   The payload flusher (payloadFlusher.js) periodically drains Redis entries
 *   into the ExecutionData collection for audit / replay.
 *
 * During execution, resolvePayload() reads from Redis first. If the key has
 * expired (>24h), it falls back to MongoDB. This means workflows that complete
 * within 24h never touch MongoDB on the hot path.
 */

import crypto from "crypto";
import { redis } from "../infra/redis.client.js";
import mongoose from "mongoose";

// ── Threshold ────────────────────────────────────────────────────────────────
const INLINE_THRESHOLD_BYTES = 32 * 1024; // 32 KB

// ── Redis Config ─────────────────────────────────────────────────────────────
const REDIS_PREFIX = "bb:payload:";
const REDIS_INDEX_PREFIX = "bb:payload-idx:"; // sorted set per workflowId
const REDIS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// ── MongoDB Fallback Collection ──────────────────────────────────────────────
const COLLECTION = "payload_blobs";

interface PayloadBlob {
  _id: string;
  workflowId: string;
  nodeId: string;
  data: unknown;
  createdAt: Date;
}

/**
 * Check if a value is a binary metadata pointer.
 * Binary refs flow through the DAG as-is — they should never be
 * resolved as payload refs or have their bytes inlined into state.
 */
export function isBinaryRef(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === "binary" &&
    typeof (value as Record<string, unknown>).fileId === "string" &&
    typeof (value as Record<string, unknown>).storageKey === "string"
  );
}

/**
 * Store a node output if it exceeds the inline threshold.
 * Writes to Redis with 24h TTL. Returns a reference ID, or null if inline.
 * Binary metadata pointers are always kept inline (they're tiny JSON objects
 * that reference files in S3/local disk — the actual bytes are never here).
 */
export async function storePayload(
  workflowId: string,
  nodeId: string,
  data: unknown,
): Promise<string | null> {
  // Binary metadata pointers are small and must remain inline so downstream
  // nodes can inspect the type/mimeType fields without a vault round-trip.
  if (isBinaryRef(data)) return null;

  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, "utf-8") < INLINE_THRESHOLD_BYTES) {
    return null; // keep inline
  }

  const id = `pb_${crypto.randomUUID()}`;
  const redisKey = `${REDIS_PREFIX}${id}`;

  // Store the payload blob in Redis
  const blob = JSON.stringify({ workflowId, nodeId, data });
  await redis.set(redisKey, blob, "EX", REDIS_TTL_SECONDS);

  // Track this payload in a per-workflow sorted set (score = timestamp)
  // so the flusher can batch-read all payloads for a workflow.
  const indexKey = `${REDIS_INDEX_PREFIX}${workflowId}`;
  await redis.zadd(indexKey, Date.now(), id);
  await redis.expire(indexKey, REDIS_TTL_SECONDS);

  return id;
}

/**
 * Resolve a payload reference back to the original data.
 * Tier 1: Redis (hot). Tier 2: MongoDB (cold fallback).
 */
export async function resolvePayload(ref: string): Promise<unknown> {
  // Tier 1: Try Redis first
  const redisKey = `${REDIS_PREFIX}${ref}`;
  const cached = await redis.get(redisKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return parsed.data;
  }

  // Tier 2: Fall back to MongoDB (flushed data or legacy blobs)
  const db = mongoose.connection.db;
  if (!db) throw new Error("PayloadStore: MongoDB not connected");

  const doc = await db.collection<PayloadBlob>(COLLECTION).findOne({ _id: ref });
  if (!doc) throw new Error(`PayloadStore: Blob "${ref}" not found in Redis or MongoDB`);
  return doc.data;
}

/**
 * Check if a value is a payload reference and resolve it if so.
 * Binary metadata pointers are passed through untouched.
 */
export async function resolveIfRef(value: unknown): Promise<unknown> {
  // Binary metadata pointers should flow through as-is
  if (isBinaryRef(value)) return value;

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "_payloadRef" in (value as Record<string, unknown>)
  ) {
    return resolvePayload(
      (value as Record<string, unknown>)._payloadRef as string,
    );
  }
  return value;
}

/**
 * Flush all payloads for a workflow from Redis into MongoDB.
 * Called by the background flusher after a workflow completes.
 * Returns the number of payloads flushed.
 */
export async function flushWorkflowPayloads(
  workflowId: string,
): Promise<number> {
  const indexKey = `${REDIS_INDEX_PREFIX}${workflowId}`;
  const payloadIds = await redis.zrange(indexKey, 0, -1);

  if (payloadIds.length === 0) return 0;

  const db = mongoose.connection.db;
  if (!db) return 0;

  const collection = db.collection<PayloadBlob>(COLLECTION);
  const bulkOps: Array<{
    updateOne: {
      filter: { _id: string };
      update: { $setOnInsert: PayloadBlob };
      upsert: boolean;
    };
  }> = [];

  for (const id of payloadIds) {
    const redisKey = `${REDIS_PREFIX}${id}`;
    const raw = await redis.get(redisKey);
    if (!raw) continue;

    const parsed = JSON.parse(raw);
    bulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $setOnInsert: {
            _id: id,
            workflowId: parsed.workflowId,
            nodeId: parsed.nodeId,
            data: parsed.data,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  let flushed = 0;
  if (bulkOps.length > 0) {
    const result = await collection.bulkWrite(bulkOps, { ordered: false });
    flushed = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
  }

  // Clean up Redis: remove the payload keys and the index
  const pipeline = redis.pipeline();
  for (const id of payloadIds) {
    pipeline.del(`${REDIS_PREFIX}${id}`);
  }
  pipeline.del(indexKey);
  await pipeline.exec();

  return flushed;
}

/**
 * Cleanup all blobs for a completed workflow (MongoDB only).
 * Called as a final Temporal activity for eager cleanup.
 */
export async function cleanupPayloads(workflowId: string): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) return 0;
  const result = await db
    .collection(COLLECTION)
    .deleteMany({ workflowId });
  return result.deletedCount;
}

/**
 * Get all workflow IDs that have pending payloads in Redis.
 * Used by the flusher to discover which workflows to flush.
 */
export async function getPendingWorkflowIds(): Promise<string[]> {
  const pattern = `${REDIS_INDEX_PREFIX}*`;
  const ids: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    for (const key of keys) {
      ids.push(key.replace(REDIS_INDEX_PREFIX, ""));
    }
  } while (cursor !== "0");

  return ids;
}

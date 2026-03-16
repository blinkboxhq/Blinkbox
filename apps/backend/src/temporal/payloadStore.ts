/**
 * PayloadStore — Persists large node outputs in MongoDB and returns
 * lightweight reference pointers for Temporal workflow state.
 *
 * Payloads below INLINE_THRESHOLD_BYTES stay inline (no DB round-trip).
 * Large payloads are stored and referenced via { _payloadRef: "<id>" }.
 */

import crypto from "crypto";
import mongoose from "mongoose";

// ── Threshold ────────────────────────────────────────────────────────────────
const INLINE_THRESHOLD_BYTES = 32 * 1024; // 32 KB

// ── MongoDB Collection (lightweight — no Mongoose schema overhead) ────────────
const COLLECTION = "payload_blobs";

interface PayloadBlob {
  _id: string;
  workflowId: string;
  nodeId: string;
  data: unknown;
  createdAt: Date;
}

/**
 * Store a node output if it exceeds the inline threshold.
 * Returns a reference ID, or null if the payload is small enough to stay inline.
 */
export async function storePayload(
  workflowId: string,
  nodeId: string,
  data: unknown,
): Promise<string | null> {
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, "utf-8") < INLINE_THRESHOLD_BYTES) {
    return null; // keep inline
  }

  const id = `pb_${crypto.randomUUID()}`;
  const db = mongoose.connection.db;
  if (!db) throw new Error("PayloadStore: MongoDB not connected");

  await db.collection<PayloadBlob>(COLLECTION).insertOne({
    _id: id,
    workflowId,
    nodeId,
    data,
    createdAt: new Date(),
  });

  return id;
}

/**
 * Resolve a payload reference back to the original data.
 */
export async function resolvePayload(ref: string): Promise<unknown> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("PayloadStore: MongoDB not connected");

  const doc = await db.collection<PayloadBlob>(COLLECTION).findOne({ _id: ref });
  if (!doc) throw new Error(`PayloadStore: Blob "${ref}" not found`);
  return doc.data;
}

/**
 * Check if a value is a payload reference and resolve it if so.
 */
export async function resolveIfRef(value: unknown): Promise<unknown> {
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
 * Cleanup all blobs for a completed workflow.
 */
export async function cleanupPayloads(workflowId: string): Promise<number> {
  const db = mongoose.connection.db;
  if (!db) return 0;
  const result = await db
    .collection(COLLECTION)
    .deleteMany({ workflowId });
  return result.deletedCount;
}

/**
 * Cursor Queue — BullMQ Edition
 *
 * Replaces raw Redis LPUSH/RPOP with BullMQ's reliable queue.
 * BullMQ handles: job delivery, visibility timeout, stalled job recovery.
 * No more dequeueCursor() — the BullMQ Worker consumes jobs automatically.
 */

import { cursorQueue } from "../../infra/bullmq.js";

/**
 * Enqueue a cursor for processing.
 * @param {Object} payload - { executionId, cursorId }
 */
export async function enqueueCursor(payload) {
  await cursorQueue.add("process-cursor", payload);
}

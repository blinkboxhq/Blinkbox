/**
 * BullMQ Queue Infrastructure
 *
 * Replaces the raw Redis LPUSH/RPOP queue with production-grade BullMQ.
 * Provides: standard queue, delayed jobs, dead-letter queue, and stalled job recovery.
 *
 * Architecture:
 *   - cursorQueue: Main execution queue for cursor processing
 *   - deadLetterQueue: Captures jobs that fail at the infrastructure level
 *   - Separate ioredis connections for Queue vs Worker (BullMQ requirement)
 */

import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

// ── Connection Factory ────────────────────────────────────────────────────────
// BullMQ requires maxRetriesPerRequest: null (disables auto-retry on commands).
// We create dedicated connections so the main app's Redis client isn't affected.

function createBullMQConnection() {
  return new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  });
}

// ── Main Execution Queue ──────────────────────────────────────────────────────
export const cursorQueue = new Queue("bb-cursor-execute", {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    attempts: 1,  // App-level retries handled by cursor state machine, not BullMQ
    removeOnComplete: { count: 1000 },  // Keep last 1000 for debugging
    removeOnFail: { count: 5000 },      // Keep failed for dead-letter inspection
  },
});

// ── Dead Letter Queue ─────────────────────────────────────────────────────────
// Jobs that fail at the BullMQ level (not app-level retries) land here.
// Operators can inspect and replay these jobs.
export const deadLetterQueue = new Queue("bb-cursor-dead-letter", {
  connection: createBullMQConnection(),
});

// ── Queue Events (monitoring) ─────────────────────────────────────────────────
export const cursorQueueEvents = new QueueEvents("bb-cursor-execute", {
  connection: createBullMQConnection(),
});

// ── Export connection factory for Worker creation ─────────────────────────────
export { createBullMQConnection };

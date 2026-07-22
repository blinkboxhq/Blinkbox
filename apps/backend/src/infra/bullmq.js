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

// A Queue opens its Redis socket the moment it is constructed, so building these
// at module load meant any file that merely imported this one — a unit test
// reaching for a single pure function — opened sockets that retried forever and
// kept the event loop alive, so the process never exited. Build on first use.
const once = (build) => {
  let instance = null;
  return () => (instance ??= build());
};

// ── Main Execution Queue ──────────────────────────────────────────────────────
export const getCursorQueue = once(() => new Queue("bb-cursor-execute", {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    attempts: 1,  // App-level retries handled by cursor state machine, not BullMQ
    removeOnComplete: { count: 1000 },  // Keep last 1000 for debugging
    removeOnFail: { count: 5000 },      // Keep failed for dead-letter inspection
  },
}));

// ── Dead Letter Queue ─────────────────────────────────────────────────────────
// Jobs that fail at the BullMQ level (not app-level retries) land here.
// Operators can inspect and replay these jobs.
export const getDeadLetterQueue = once(() => new Queue("bb-cursor-dead-letter", {
  connection: createBullMQConnection(),
}));

// ── Queue Events (monitoring) ─────────────────────────────────────────────────
export const getCursorQueueEvents = once(() => new QueueEvents("bb-cursor-execute", {
  connection: createBullMQConnection(),
}));

// ── Export connection factory for Worker creation ─────────────────────────────
export { createBullMQConnection };

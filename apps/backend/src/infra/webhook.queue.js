/**
 * Webhook Queue — "The Shock Absorber"
 *
 * BullMQ queue that sits between incoming webhook HTTP requests and the
 * Temporal client. Instead of calling Temporal directly on every HTTP hit,
 * the webhook controller pushes to this queue and returns 202 Accepted.
 *
 * The webhook worker (webhook.worker.js) drains the queue with concurrency
 * limits, protecting the Temporal client from traffic spikes.
 *
 * Queue: bb-webhook-ingest
 * DLQ:   bb-webhook-dead-letter
 */

import { Queue } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";

export const webhookQueue = new Queue("bb-webhook-ingest", {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 5000 },
    removeOnFail: { count: 10000 },
  },
});

export const webhookDeadLetterQueue = new Queue("bb-webhook-dead-letter", {
  connection: createBullMQConnection(),
});

/**
 * Webhook Worker — Drains the bb-webhook-ingest queue.
 *
 * Concurrency is capped at 10 to protect the Temporal client from being
 * overwhelmed during traffic spikes. BullMQ handles backpressure: if all
 * 10 slots are busy, new jobs wait in Redis until a slot opens.
 *
 * Each job contains the pre-validated automation ID, webhook payload, and
 * idempotency key. The worker calls startWorkflowExecution() — the same
 * function the controller used to call directly.
 *
 * Failed jobs retry 3× with exponential backoff (configured on the queue).
 * After exhausting retries, they land in the dead-letter queue.
 */

import { Worker } from "../../infra/bullmq.prefixed.js";
import { createBullMQConnection } from "../../infra/bullmq.js";
import { webhookDeadLetterQueue } from "../../infra/webhook.queue.js";
import { executeAutomation } from "../automation/automation.executor.js";
import Automation from "../../models/automation.model.js";

const CONCURRENCY = 10;
let worker = null;

export async function startWebhookWorker() {
  console.log(
    `[Webhook Worker] Starting BullMQ webhook worker (concurrency: ${CONCURRENCY})...`,
  );

  worker = new Worker(
    "bb-webhook-ingest",
    async (job) => {
      const { automationId, webhookData, idempotencyKey, workspaceId, entryNodeId } =
        job.data;

      // Re-fetch the automation to get the latest version.
      // The controller only validated existence at enqueue time — the
      // automation may have been deactivated between enqueue and processing.
      const automation = await Automation.findById(automationId);
      if (!automation || !automation.active) {
        console.warn(
          `[Webhook Worker] Automation ${automationId} not found or inactive — skipping.`,
        );
        return; // Complete the job without error (no point retrying)
      }

      await executeAutomation(automation, webhookData, {
        idempotencyKey,
        workspaceId,
        ...(entryNodeId ? { entryNodeId } : {}),
      });
    },
    {
      connection: createBullMQConnection(),
      concurrency: CONCURRENCY,
      stalledInterval: 30000,
      maxStalledCount: 2,
      lockDuration: 60000,
    },
  );

  worker.on("failed", async (job, err) => {
    console.error(
      `[Webhook Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message,
    );

    // After all retries exhausted, move to DLQ
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await webhookDeadLetterQueue.add("dead-webhook", {
        ...job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        originalJobId: job.id,
      });
    }
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[Webhook Worker] Job ${jobId} stalled — auto-retrying`);
  });

  worker.on("error", (err) => {
    console.error("[Webhook Worker] Error:", err.message);
  });

  console.log("[Webhook Worker] Ready. Draining webhook queue...");
  return true;
}

export async function stopWebhookWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

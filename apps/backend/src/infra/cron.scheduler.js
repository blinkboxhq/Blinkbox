/**
 * Cron Scheduler Service
 *
 * Manages scheduled automation triggers using BullMQ repeatable jobs.
 * Each active cron-triggered automation gets a repeatable job in BullMQ
 * that fires according to its cron expression.
 *
 * Flow:
 *   1. On startup: sync all active cron automations to BullMQ repeatables
 *   2. When a cron job fires: call executeAutomation() with timestamp payload
 *   3. When an automation is activated/deactivated: add/remove the repeatable
 *
 * Supported schedule formats:
 *   - Standard cron: "0 9 * * *" (every day at 9am)
 *   - Every N minutes: star-slash-5 pattern (every 5 minutes)
 *   - BullMQ also supports `every` in ms for simple intervals
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";

const CRON_QUEUE_NAME = "bb-cron-scheduler";

let cronQueue = null;
let cronWorker = null;

export async function startCronScheduler() {
  console.log("[CronScheduler] Starting...");

  cronQueue = new Queue(CRON_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  // Worker: when a cron job fires, trigger the automation
  cronWorker = new Worker(
    CRON_QUEUE_NAME,
    async (job) => {
      const { automationId, triggerNodeId } = job.data;

      // Dynamic import to avoid circular deps
      const { executeAutomation } = await import(
        "../modules/automation/automation.executor.js"
      );

      const automation = await Automation.findOne({
        _id: automationId,
        active: true,
      });

      if (!automation) {
        console.log(`[CronScheduler] Automation ${automationId} no longer active, skipping`);
        return;
      }

      console.log(`[CronScheduler] Firing cron for: ${automation.name}`);

      await executeAutomation(
        automation,
        {
          triggeredAt: new Date().toISOString(),
          schedule: job.opts?.repeat?.pattern || "unknown",
          triggerType: "cron",
        },
        {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `cron-${triggerNodeId || automationId}-${Date.now()}`,
        },
      );
    },
    {
      connection: createBullMQConnection(),
      concurrency: 2,
    },
  );

  cronWorker.on("failed", (job, err) => {
    console.error(`[CronScheduler] Job failed for automation ${job?.data?.automationId}:`, err.message);
  });

  // Sync all active cron automations on startup
  await syncCronJobs();

  console.log("[CronScheduler] Ready");
}

/**
 * Sync all active cron-triggered automations to BullMQ repeatable jobs.
 * Called on startup and when automations are activated/deactivated.
 */
export async function syncCronJobs() {
  if (!cronQueue) return;

  // Remove all existing repeatable jobs first (clean slate)
  const existing = await cronQueue.getRepeatableJobs();
  for (const job of existing) {
    await cronQueue.removeRepeatableByKey(job.key);
  }

  // Find all active cron automations
  const cronAutomations = await findAutomationsWithTrigger("cron_trigger");

  let registered = 0;
  for (const automation of cronAutomations) {
    for (const node of getTriggerNodesOfType(automation, "cron_trigger")) {
      const cfg = getTriggerConfig(node);
      const schedule = cfg.cronExpression || cfg.schedule || automation.settings?.cronExpression;
      if (!schedule) {
        console.warn(`[CronScheduler] Automation ${automation._id} node ${node.id} has no cronExpression, skipping`);
        continue;
      }

      await cronQueue.add(
        "cron-fire",
        { automationId: automation._id.toString(), triggerNodeId: node.id },
        {
          repeat: { pattern: schedule },
          jobId: `cron-${automation._id}-${node.id}`,
        },
      );

      registered++;
      console.log(`[CronScheduler] Registered: "${automation.name}" node ${node.id} → ${schedule}`);
    }
  }

  console.log(`[CronScheduler] Synced ${registered} cron trigger nodes across ${cronAutomations.length} automations`);
}

/**
 * Add a single cron job for an automation.
 */
export async function addCronJob(automationId, cronExpression) {
  if (!cronQueue) return;
  await cronQueue.add(
    "cron-fire",
    { automationId: automationId.toString() },
    {
      repeat: { pattern: cronExpression },
      jobId: `cron-${automationId}`,
    },
  );
}

/**
 * Remove a cron job for an automation.
 */
export async function removeCronJob(automationId) {
  if (!cronQueue) return;
  const jobs = await cronQueue.getRepeatableJobs();
  for (const job of jobs) {
    if (job.id === `cron-${automationId}`) {
      await cronQueue.removeRepeatableByKey(job.key);
    }
  }
}

export async function stopCronScheduler() {
  if (cronWorker) await cronWorker.close();
  if (cronQueue) await cronQueue.close();
  cronWorker = null;
  cronQueue = null;
}

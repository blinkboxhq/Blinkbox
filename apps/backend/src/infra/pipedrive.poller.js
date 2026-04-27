/**
 * Pipedrive Poller
 * Polls Pipedrive CRM for new deals or persons using REST API v1.
 * Dedup key: bb:pipedrive:seen:{automationId} — item ID set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-pipedrive-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let pipedriveQueue = null;
let pipedriveWorker = null;

async function fetchItems(apiToken, watchType) {
  const endpoint = watchType === "person" ? "persons" : "deals";
  const url = `https://api.pipedrive.com/v1/${endpoint}?api_token=${apiToken}&sort=add_time DESC&limit=25`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pipedrive API ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

async function pollPipedrive(automationId, cfg) {
  const lockKey = `bb:pipedrive:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { apiToken, stageFilter } = cfg;
    const watchType = cfg.watchType || cfg.entityType || "deal";
    if (!apiToken) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const items = await fetchItems(apiToken, watchType);
    const seenKey = `bb:pipedrive:seen:${automationId}`;
    for (const item of items) {
      const id = String(item.id);
      if (stageFilter && item.stage_id && String(item.stage_id) !== String(stageFilter)) continue;
      const added = await redis.sadd(seenKey, id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = watchType === "deal"
        ? { id, title: item.title || "", value: item.value, currency: item.currency, stage: item.stage_id, status: item.status, ownerName: item.owner_name || "", personName: item.person_name || "", addTime: item.add_time }
        : { id, name: item.name || "", email: item.email?.[0]?.value || "", phone: item.phone?.[0]?.value || "", orgName: item.org_name || "", addTime: item.add_time };
      await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, idempotencyKey: `pipedrive:${automationId}:${id}` });
    }
  } catch (err) {
    console.warn(`[PipedrivePoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startPipedrivePoller() {
  console.log("[PipedrivePoller] Starting...");
  pipedriveQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  pipedriveWorker = new Worker(QUEUE_NAME, async (job) => { await pollPipedrive(job.data.automationId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
  pipedriveWorker.on("failed", (job, err) => console.error(`[PipedrivePoller] Job failed:`, err.message));
  await syncPipedriveJobs();
  console.log("[PipedrivePoller] Ready");
}

export async function syncPipedriveJobs() {
  if (!pipedriveQueue) return;
  const existing = await pipedriveQueue.getRepeatableJobs();
  for (const job of existing) await pipedriveQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "pipedrive_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.apiToken) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await pipedriveQueue.add("pipedrive-poll", { automationId: automation._id.toString(), cfg: { apiToken: cfg.apiToken, watchType: cfg.watchType || cfg.entityType, stageFilter: cfg.stageFilter } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `pipedrive-${automation._id}` });
  }
  console.log(`[PipedrivePoller] Synced ${automations.length} automations`);
}

export async function stopPipedrivePoller() {
  if (pipedriveWorker) await pipedriveWorker.close();
  if (pipedriveQueue) await pipedriveQueue.close();
  pipedriveWorker = null; pipedriveQueue = null;
}

/**
 * Asana Task Poller
 * Polls Asana projects for new or modified tasks.
 * Dedup key: bb:asana:seen:{automationId} — task GID set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-asana-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let asanaQueue = null;
let asanaWorker = null;

async function fetchTasks(token, projectId) {
  const url = `https://app.asana.com/api/1.0/projects/${projectId}/tasks?opt_fields=gid,name,completed,assignee.name,due_on,created_at,notes&limit=25&order=created_at`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Asana API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

export async function pollAsana(automationId, cfg) {
  const lockKey = `bb:asana:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const token = cfg.token || cfg.accessToken;
    const projectId = cfg.projectId || cfg.projectGid;
    const watchType = cfg.watchType || cfg.eventType || "new_task";
    if (!token || !projectId) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const tasks = await fetchTasks(token, projectId);
    const seenKey = `bb:asana:seen:${automationId}`;
    for (const task of tasks) {
      if (watchType === "completed" && !task.completed) continue;
      if (watchType === "new_task" && task.completed) continue;
      const added = await redis.sadd(seenKey, task.gid);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      await executeAutomation(automation, { gid: task.gid, name: task.name || "", completed: task.completed, assignee: task.assignee?.name || "", dueOn: task.due_on || "", notes: task.notes || "", createdAt: task.created_at, projectId, url: `https://app.asana.com/0/${projectId}/${task.gid}` }, { workspaceId: automation.workspaceId, idempotencyKey: `asana:${automationId}:${task.gid}` });
    }
  } catch (err) {
    console.warn(`[AsanaPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startAsanaPoller() {
  console.log("[AsanaPoller] Starting...");
  asanaQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  asanaWorker = new Worker(QUEUE_NAME, async (job) => { await pollAsana(job.data.automationId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
  asanaWorker.on("failed", (job, err) => console.error(`[AsanaPoller] Job failed:`, err.message));
  await syncAsanaJobs();
  console.log("[AsanaPoller] Ready");
}

export async function syncAsanaJobs() {
  if (!asanaQueue) return;
  const existing = await asanaQueue.getRepeatableJobs();
  for (const job of existing) await asanaQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "asana_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const token = cfg.token || cfg.accessToken;
    const projectId = cfg.projectId || cfg.projectGid;
    if (!token || !projectId) continue;
    const interval = Math.max(1, Math.round(
      cfg.pollIntervalMinutes ? parseInt(cfg.pollIntervalMinutes) :
      cfg.pollIntervalSeconds ? parseInt(cfg.pollIntervalSeconds) / 60 : 5
    ));
    await asanaQueue.add("asana-poll", { automationId: automation._id.toString(), cfg: { token, projectId, watchType: cfg.watchType || cfg.eventType } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `asana-${automation._id}` });
  }
  console.log(`[AsanaPoller] Synced ${automations.length} automations`);
}

export async function stopAsanaPoller() {
  if (asanaWorker) await asanaWorker.close();
  if (asanaQueue) await asanaQueue.close();
  asanaWorker = null; asanaQueue = null;
}

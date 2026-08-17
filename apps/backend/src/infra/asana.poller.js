/**
 * Asana Task Poller
 * Polls Asana projects for new or modified tasks.
 * Dedup key: bb:asana:seen:{automationId} — task GID set, 30-day TTL.
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { resolveSecret } from "../utils/resolveSecret.js";

const QUEUE_NAME = "bb-asana-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let asanaQueue = null;
let asanaWorker = null;

const ASANA_FIELDS = [
  "gid", "name", "completed", "completed_at", "assignee.name", "due_on",
  "created_at", "modified_at", "notes", "parent.gid", "tags.name",
  "memberships.section.name",
].join(",");

function asTodayISO() { return new Date().toISOString().slice(0, 10); }
function daysFromNow(d) {
  if (!d) return Infinity;
  return Math.round((new Date(d + "T00:00:00Z") - new Date(asTodayISO() + "T00:00:00Z")) / 86400000);
}

// Each event is a distinct, real Asana condition over the enriched task list.
// `changeAware` events dedup on a changing timestamp so they re-fire on the transition.
const ASANA_MATCH = {
  new_task:        { changeAware: false, match: (t) => !t.completed },
  task_completed:  { changeAware: true,  match: (t) => !!t.completed,  ts: (t) => t.completed_at || t.modified_at },
  task_assigned:   { changeAware: true,  match: (t) => !!t.assignee && !t.completed, ts: (t) => t.modified_at },
  task_unassigned: { changeAware: true,  match: (t) => !t.assignee && !t.completed,  ts: (t) => t.modified_at },
  due_today:       { changeAware: false, match: (t) => !t.completed && t.due_on === asTodayISO() },
  overdue:         { changeAware: false, match: (t) => !t.completed && t.due_on && daysFromNow(t.due_on) < 0 },
  due_soon:        { changeAware: false, match: (t, cfg) => !t.completed && t.due_on && daysFromNow(t.due_on) >= 0 && daysFromNow(t.due_on) <= (Number(cfg.dueWithinDays) || 3) },
  no_due_date:     { changeAware: false, match: (t) => !t.completed && !t.due_on },
  in_section:      { changeAware: true,  match: (t, cfg) => (t.memberships || []).some((m) => m.section?.name?.toLowerCase() === String(cfg.sectionName || "").toLowerCase()), ts: (t) => t.modified_at },
  has_tag:         { changeAware: false, match: (t, cfg) => (t.tags || []).some((tg) => tg.name?.toLowerCase() === String(cfg.tagName || "").toLowerCase()) },
  subtask_added:   { changeAware: false, match: (t) => !!t.parent?.gid },
};

async function fetchTasks(token, projectId) {
  const url = `https://app.asana.com/api/1.0/projects/${projectId}/tasks?opt_fields=${ASANA_FIELDS}&limit=50&order=created_at`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Asana API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

export async function pollAsana(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:asana:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const rawToken = cfg.token || cfg.accessToken;
    const projectId = cfg.projectId || cfg.projectGid;
    let eventType = cfg.eventType || cfg.watchType || "new_task";
    if (eventType === "completed") eventType = "task_completed";
    const spec = ASANA_MATCH[eventType] || ASANA_MATCH.new_task;
    if (!rawToken || !projectId) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const token = await resolveSecret(rawToken, automation.workspaceId?.toString(), "Asana trigger");
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const tasks = await fetchTasks(token, projectId);
    const seenKey = `bb:asana:seen:${scope}:${eventType}`;
    for (const task of tasks) {
      if (!spec.match(task, cfg)) continue;
      const dedupId = spec.changeAware ? `${task.gid}:${spec.ts?.(task) || task.modified_at || ""}` : task.gid;
      const added = await redis.sadd(seenKey, dedupId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        gid: task.gid, name: task.name || "", completed: task.completed,
        completedAt: task.completed_at || "", assignee: task.assignee?.name || "",
        dueOn: task.due_on || "", notes: task.notes || "", createdAt: task.created_at,
        modifiedAt: task.modified_at || "", parentGid: task.parent?.gid || "",
        tags: (task.tags || []).map((t) => t.name).filter(Boolean),
        section: (task.memberships || []).map((m) => m.section?.name).filter(Boolean)[0] || "",
        projectId, url: `https://app.asana.com/0/${projectId}/${task.gid}`,
      };
      await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `asana:${scope}:${eventType}:${dedupId}` });
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
  asanaWorker = new Worker(QUEUE_NAME, async (job) => { await pollAsana(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
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
    await asanaQueue.add("asana-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { token, projectId, eventType: cfg.eventType || cfg.watchType, dueWithinDays: cfg.dueWithinDays, sectionName: cfg.sectionName, tagName: cfg.tagName } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `asana-${automation._id}` });
  }
  console.log(`[AsanaPoller] Synced ${automations.length} automations`);
}

export async function stopAsanaPoller() {
  if (asanaWorker) await asanaWorker.close();
  if (asanaQueue) await asanaQueue.close();
  asanaWorker = null; asanaQueue = null;
}

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

// Each event = a real Pipedrive REST endpoint + a server-side `params` slice +
// a client-side `match` predicate + a `shape` mapper. `eventType` selects it.
const PIPEDRIVE_SCOPES = {
  deal_created:      { endpoint: "deals",         params: "",                match: () => true,                                       shape: dealShape },
  deal_won:          { endpoint: "deals",         params: "status=won",      match: () => true,                                       shape: dealShape },
  deal_lost:         { endpoint: "deals",         params: "status=lost",     match: () => true,                                       shape: dealShape },
  deal_high_value:   { endpoint: "deals",         params: "status=open",     match: (i, cfg) => Number(i.value || 0) >= Number(cfg.minValue || 0), shape: dealShape },
  person_created:    { endpoint: "persons",       params: "",                match: () => true,                                       shape: personShape },
  organization_created: { endpoint: "organizations", params: "",            match: () => true,                                       shape: orgShape },
  activity_created:  { endpoint: "activities",    params: "",                match: () => true,                                       shape: activityShape },
  activity_done:     { endpoint: "activities",    params: "done=1",          match: () => true,                                       shape: activityShape },
  activity_overdue:  { endpoint: "activities",    params: "done=0",          match: (i) => !!i.due_date && new Date(i.due_date) < new Date(), shape: activityShape },
  lead_created:      { endpoint: "leads",         params: "",                match: () => true,                                       shape: leadShape },
  note_created:      { endpoint: "notes",         params: "",                match: () => true,                                       shape: noteShape },
};

function dealShape(i) {
  return { id: String(i.id), title: i.title || "", value: i.value, currency: i.currency, stage: i.stage_id, status: i.status, ownerName: i.owner_name || "", personName: i.person_name || "", orgName: i.org_name || "", addTime: i.add_time, wonTime: i.won_time, lostReason: i.lost_reason };
}
function personShape(i) {
  return { id: String(i.id), name: i.name || "", email: i.email?.[0]?.value || "", phone: i.phone?.[0]?.value || "", orgName: i.org_name || "", ownerName: i.owner_name || "", addTime: i.add_time };
}
function orgShape(i) {
  return { id: String(i.id), name: i.name || "", peopleCount: i.people_count, ownerName: i.owner_name || "", address: i.address || "", addTime: i.add_time };
}
function activityShape(i) {
  return { id: String(i.id), subject: i.subject || "", type: i.type || "", done: i.done, dueDate: i.due_date || "", dueTime: i.due_time || "", dealTitle: i.deal_title || "", personName: i.person_name || "", orgName: i.org_name || "", ownerName: i.owner_name || "", addTime: i.add_time };
}
function leadShape(i) {
  return { id: String(i.id), title: i.title || "", value: i.value?.amount, currency: i.value?.currency, ownerId: i.owner_id, personId: i.person_id?.value, orgId: i.organization_id?.value, addTime: i.add_time };
}
function noteShape(i) {
  return { id: String(i.id), content: (i.content || "").replace(/<[^>]+>/g, ""), dealId: i.deal_id, personId: i.person_id, orgId: i.org_id, userName: i.user?.name || "", addTime: i.add_time };
}

async function fetchItems(apiToken, scope) {
  const sortKey = scope.endpoint === "leads" ? "" : "&sort=add_time DESC";
  const extra = scope.params ? `&${scope.params}` : "";
  const url = `https://api.pipedrive.com/v1/${scope.endpoint}?api_token=${apiToken}&limit=25${sortKey}${extra}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pipedrive API ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

export async function pollPipedrive(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:pipedrive:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { apiToken, stageFilter } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "deal_created";
    const spec = PIPEDRIVE_SCOPES[eventType] || PIPEDRIVE_SCOPES.deal_created;
    if (!apiToken) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const items = await fetchItems(apiToken, spec);
    // status/done flips need re-fire, so dedup on the item's update timestamp for those.
    const changeAware = ["deal_won", "deal_lost", "activity_done", "activity_overdue"].includes(eventType);
    const seenKey = `bb:pipedrive:seen:${scope}:${eventType}`;
    for (const item of items) {
      const id = String(item.id);
      if (!spec.match(item, cfg)) continue;
      if (stageFilter && item.stage_id && String(item.stage_id) !== String(stageFilter)) continue;
      const dedupId = changeAware ? `${id}:${item.update_time || item.won_time || item.marked_as_done_time || ""}` : id;
      const added = await redis.sadd(seenKey, dedupId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = spec.shape(item);
      await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `pipedrive:${scope}:${eventType}:${dedupId}` });
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
  pipedriveWorker = new Worker(QUEUE_NAME, async (job) => { await pollPipedrive(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
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
    await pipedriveQueue.add("pipedrive-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { apiToken: cfg.apiToken, eventType: cfg.eventType || cfg.watchType, stageFilter: cfg.stageFilter, minValue: cfg.minValue } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `pipedrive-${automation._id}` });
  }
  console.log(`[PipedrivePoller] Synced ${automations.length} automations`);
}

export async function stopPipedrivePoller() {
  if (pipedriveWorker) await pipedriveWorker.close();
  if (pipedriveQueue) await pipedriveQueue.close();
  pipedriveWorker = null; pipedriveQueue = null;
}

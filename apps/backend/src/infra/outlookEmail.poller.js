/**
 * Outlook Email Poller (Microsoft Graph API)
 * Polls a Microsoft 365 mailbox for new emails via Graph API.
 * Requires a Microsoft OAuth credential (Mail.Read scope).
 * Dedup key: bb:outlook:seen:{automationId} — message ID set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-outlook-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let outlookQueue = null;
let outlookWorker = null;

function escGraph(v) {
  return String(v).replace(/'/g, "''");
}

// Each event = a real Graph mail folder + a server-side $filter slice +
// an optional client-side match. `eventType` selects the OUTLOOK_EVENTS entry.
const OUTLOOK_EVENTS = {
  any_new:         { folder: "inbox",     filter: () => undefined },
  unread:          { folder: "inbox",     filter: () => "isRead eq false" },
  from_sender:     { folder: "inbox",     filter: (cfg) => cfg.fromEmail ? `from/emailAddress/address eq '${escGraph(cfg.fromEmail)}'` : undefined },
  from_domain:     { folder: "inbox",     filter: () => undefined, match: (m, cfg) => cfg.fromDomain ? (m.from?.emailAddress?.address || "").toLowerCase().endsWith(String(cfg.fromDomain).toLowerCase().replace(/^@/, "")) : true },
  subject_match:   { folder: "inbox",     filter: () => undefined, match: (m, cfg) => cfg.subjectFilter ? (m.subject || "").toLowerCase().includes(String(cfg.subjectFilter).toLowerCase()) : true },
  has_attachment:  { folder: "inbox",     filter: () => "hasAttachments eq true" },
  high_importance: { folder: "inbox",     filter: () => "importance eq 'high'" },
  flagged:         { folder: "inbox",     filter: () => "flag/flagStatus eq 'flagged'" },
  sent:            { folder: "sentitems", filter: () => undefined },
  junk:            { folder: "junkemail", filter: () => undefined },
  archived:        { folder: "archive",   filter: () => undefined },
  draft_saved:     { folder: "drafts",    filter: () => undefined },
};

async function fetchMessages(accessToken, folder = "inbox", filter) {
  let url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=20&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead,importance,flag`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.value || [];
}

export async function pollOutlook(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:outlook:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId } = cfg;
    const eventType = cfg.eventType || cfg.watchType || (cfg.onlyUnread === false ? "any_new" : "unread");
    const spec = OUTLOOK_EVENTS[eventType] || OUTLOOK_EVENTS.unread;
    if (!credentialId) return;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Outlook Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const folder = cfg.folder || spec.folder;
    const messages = await fetchMessages(accessToken, folder, spec.filter(cfg));
    const seenKey = `bb:outlook:seen:${scope}:${eventType}`;
    for (const msg of messages) {
      if (spec.match && !spec.match(msg, cfg)) continue;
      const added = await redis.sadd(seenKey, msg.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        id: msg.id,
        subject: msg.subject || "",
        from: msg.from?.emailAddress?.address || "",
        fromName: msg.from?.emailAddress?.name || "",
        receivedAt: msg.receivedDateTime,
        preview: msg.bodyPreview || "",
        hasAttachments: msg.hasAttachments || false,
        importance: msg.importance || "normal",
        flagged: msg.flag?.flagStatus === "flagged",
        folder,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `outlook:${scope}:${eventType}:${msg.id}`,
      });
    }
  } catch (err) {
    console.warn(`[OutlookPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startOutlookPoller() {
  console.log("[OutlookPoller] Starting...");
  outlookQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  outlookWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollOutlook(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  outlookWorker.on("failed", (job, err) => console.error(`[OutlookPoller] Job failed:`, err.message));
  await syncOutlookJobs();
  console.log("[OutlookPoller] Ready");
}

export async function syncOutlookJobs() {
  if (!outlookQueue) return;
  const existing = await outlookQueue.getRepeatableJobs();
  for (const job of existing) await outlookQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "outlook_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.credentialId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await outlookQueue.add("outlook-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), eventType: cfg.eventType || cfg.watchType, folder: cfg.folder, subjectFilter: cfg.subjectFilter, fromEmail: cfg.fromEmail, fromDomain: cfg.fromDomain, onlyUnread: cfg.onlyUnread },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `outlook-${automation._id}` });
  }
  console.log(`[OutlookPoller] Synced ${automations.length} automations`);
}

export async function stopOutlookPoller() {
  if (outlookWorker) await outlookWorker.close();
  if (outlookQueue) await outlookQueue.close();
  outlookWorker = null; outlookQueue = null;
}

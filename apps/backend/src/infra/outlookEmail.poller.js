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

async function fetchMessages(accessToken, folder = "inbox", filter) {
  let url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=20&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.value || [];
}

async function pollOutlook(automationId, cfg) {
  const lockKey = `bb:outlook:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId, folder = "inbox", subjectFilter, onlyUnread = true } = cfg;
    if (!credentialId) return;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Outlook Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const graphFilter = onlyUnread ? "isRead eq false" : undefined;
    const messages = await fetchMessages(accessToken, folder, graphFilter);
    const seenKey = `bb:outlook:seen:${automationId}`;
    for (const msg of messages) {
      if (subjectFilter && !msg.subject?.toLowerCase().includes(subjectFilter.toLowerCase())) continue;
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
        folder,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        idempotencyKey: `outlook:${automationId}:${msg.id}`,
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
    await pollOutlook(job.data.automationId, job.data.cfg);
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
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), folder: cfg.folder, subjectFilter: cfg.subjectFilter, onlyUnread: cfg.onlyUnread },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `outlook-${automation._id}` });
  }
  console.log(`[OutlookPoller] Synced ${automations.length} automations`);
}

export async function stopOutlookPoller() {
  if (outlookWorker) await outlookWorker.close();
  if (outlookQueue) await outlookQueue.close();
  outlookWorker = null; outlookQueue = null;
}

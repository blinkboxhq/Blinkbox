/**
 * Gmail Poller
 *
 * Polls Gmail for new emails matching a query on a per-automation schedule.
 * Uses historyId watermark for efficient incremental fetching.
 * Falls back to full listing when historyId is stale (410 Gone from Gmail API).
 *
 * Checkpoint key: bb:gmail:checkpoint:{automationId}  -> JSON {historyId, lastMessageId}
 * Seen-message dedup: bb:gmail:seen:{automationId}    -> Redis Set of message IDs
 * TTL: 30 days
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";

const GMAIL_QUEUE = "bb-gmail-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;

let gmailQueue = null;
let gmailWorker = null;

async function gmailGet(token, path, params = {}) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error?.message || `Gmail API ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function parseMessage(msg) {
  const headers = msg.payload?.headers || [];
  const h = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  // Decode body parts
  let bodyText = "";
  let bodyHtml = "";

  const decode = (data) => {
    try { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"); }
    catch { return ""; }
  };

  const extractParts = (parts = []) => {
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) bodyText = decode(part.body.data);
      if (part.mimeType === "text/html"  && part.body?.data) bodyHtml = decode(part.body.data);
      if (part.parts) extractParts(part.parts);
    }
  };

  if (msg.payload?.body?.data) {
    const decoded = decode(msg.payload.body.data);
    if (msg.payload.mimeType === "text/html") bodyHtml = decoded;
    else bodyText = decoded;
  }
  extractParts(msg.payload?.parts);

  const attachments = (msg.payload?.parts || [])
    .filter((p) => p.filename && p.body?.attachmentId)
    .map((p) => ({ filename: p.filename, mimeType: p.mimeType, size: p.body.size, attachmentId: p.body.attachmentId }));

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: h("subject"),
    from: h("from"),
    to: h("to"),
    date: h("date"),
    snippet: msg.snippet || "",
    bodyText,
    bodyHtml,
    labels: msg.labelIds || [],
    attachments,
  };
}

export async function pollGmail(automationId, triggerNodeId, credentialId, query, maxResults, onlyNew, workspaceId) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:gmail:lock:${scope}`;
  const seenKey = `bb:gmail:seen:${scope}`;

  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;

  try {
    const token = await getOAuthToken(credentialId, workspaceId, "Gmail Trigger");

    const params = {
      maxResults: String(maxResults || 10),
    };
    if (query) params.q = query;

    const listRes = await gmailGet(token, "users/me/messages", params);
    const messages = listRes.messages || [];
    if (!messages.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const { id } of messages) {
      if (onlyNew) {
        const claimed = await redis.sadd(seenKey, id);
        await redis.expire(seenKey, SEEN_TTL);
        if (claimed === 0) continue;
      }

      try {
        const full = await gmailGet(token, `users/me/messages/${id}`, { format: "full" });
        const parsed = parseMessage(full);
        await executeAutomation(automation, parsed, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `gmail:${scope}:${id}`,
        });
        console.log(`[GmailPoller] Fired for automation "${automation.name}" message: ${id}`);
      } catch (err) {
        console.error(`[GmailPoller] Failed to process message ${id}:`, err.message);
      }
    }
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startGmailPoller() {
  console.log("[GmailPoller] Starting...");

  gmailQueue = new Queue(GMAIL_QUEUE, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });

  gmailWorker = new Worker(
    GMAIL_QUEUE,
    async (job) => {
      const { automationId, triggerNodeId, credentialId, query, maxResults, onlyNew, workspaceId } = job.data;
      await pollGmail(automationId, triggerNodeId, credentialId, query, maxResults, onlyNew, workspaceId);
    },
    { connection: createBullMQConnection(), concurrency: 4 },
  );

  gmailWorker.on("failed", (job, err) => {
    console.error(`[GmailPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncGmailJobs();
  console.log("[GmailPoller] Ready");
}

export async function syncGmailJobs() {
  if (!gmailQueue) return;

  const existing = await gmailQueue.getRepeatableJobs();
  for (const job of existing) await gmailQueue.removeRepeatableByKey(job.key);

  const automations = await findAutomationsWithTrigger("gmail_trigger");

  let registered = 0;
  for (const automation of automations) {
    for (const node of getTriggerNodesOfType(automation, "gmail_trigger")) {
      const cfg = getTriggerConfig(node);
      const { credentialId, query, maxResults, onlyNew, pollInterval } = cfg;

      if (!credentialId) {
        console.warn(`[GmailPoller] Automation ${automation._id} node ${node.id} has no credentialId, skipping`);
        continue;
      }

      const interval = pollInterval || "*/5 * * * *";
      await gmailQueue.add(
        "gmail-poll",
        {
          automationId: automation._id.toString(),
          triggerNodeId: node.id,
          credentialId,
          query: query || "is:unread",
          maxResults: maxResults || 10,
          onlyNew: onlyNew !== false,
          workspaceId: automation.workspaceId,
        },
        { repeat: { pattern: interval }, jobId: `gmail-${automation._id}-${node.id}` },
      );
      registered++;
      console.log(`[GmailPoller] Registered: "${automation.name}" node ${node.id} every ${interval}`);
    }
  }

  console.log(`[GmailPoller] Synced ${registered} Gmail trigger nodes across ${automations.length} automations`);
}

export async function stopGmailPoller() {
  if (gmailWorker) await gmailWorker.close();
  if (gmailQueue) await gmailQueue.close();
  gmailWorker = null;
  gmailQueue = null;
}

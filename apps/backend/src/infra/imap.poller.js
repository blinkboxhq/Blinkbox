/**
 * IMAP Email Poller
 *
 * Polls IMAP mailboxes on a per-automation cron schedule.
 * Uses the `imapflow` library (lightweight, modern IMAP client).
 * Each automation stores credentials via the BlinkBox credential vault
 * — the password field is resolved at runtime via resolveCredential().
 *
 * Flow per tick:
 *   1. Connect to IMAP server (TLS)
 *   2. SELECT mailbox
 *   3. SEARCH UNSEEN (or ALL if onlyUnread=false)
 *   4. FETCH envelope + body for new UIDs
 *   5. Fire automation once per email
 *   6. STORE +FLAGS \Seen if markRead=true
 *   7. Logout
 *
 * Deduplication: we track the highest UID seen per automation in Redis.
 * This means even if markRead is off, we won't re-process old messages.
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeHost } from "../utils/ssrf.js";

const IMAP_QUEUE_NAME = "bb-imap-poller";

let imapQueue = null;
let imapWorker = null;

// Walk an imapflow bodyStructure tree and collect attachment parts (anything
// with a filename or a disposition of "attachment"), plus a total byte size.
function walkStructure(node, attachments, sizeRef) {
  if (!node) return;
  if (Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) walkStructure(child, attachments, sizeRef);
  }
  sizeRef.size += node.size || 0;
  const fname = node.dispositionParameters?.filename || node.parameters?.name;
  const isAttachment = (node.disposition || "").toLowerCase() === "attachment";
  if (fname || (isAttachment && node.type && node.type !== "multipart")) {
    attachments.push({ filename: fname || "", type: node.type || "", size: node.size || 0 });
  }
}

const lc = (s) => String(s ?? "").toLowerCase();
// Each event = a predicate over the normalized email payload. `eventType`
// (passed via cfg) selects the entry; question events read cfg.targetValue.
const IMAP_EVENTS = {
  new_email:        { match: () => true },
  from_sender:      { match: (e, c) => lc(e.from) === lc(c.targetValue) },
  from_domain:      { match: (e, c) => lc(e.from).endsWith("@" + lc(c.targetValue).replace(/^@/, "")) },
  subject_contains: { match: (e, c) => lc(e.subject).includes(lc(c.targetValue)) },
  subject_is:       { match: (e, c) => lc(e.subject).trim() === lc(c.targetValue).trim() },
  body_contains:    { match: (e, c) => (lc(e.text) + lc(e.html)).includes(lc(c.targetValue)) },
  to_address:       { match: (e, c) => lc(e.to).includes(lc(c.targetValue)) },
  cc_address:       { match: (e, c) => lc(e.cc).includes(lc(c.targetValue)) },
  has_attachment:   { match: (e) => (e.attachments?.length || 0) > 0 },
  attachment_named: { match: (e, c) => (e.attachments || []).some(a => lc(a.filename).includes(lc(c.targetValue))) },
  large_email:      { match: (e, c) => (e.sizeBytes || 0) >= Number(c.targetValue || 0) * 1024 },
  reply_email:      { match: (e) => /^\s*re:/i.test(e.subject || "") },
};

export async function pollMailbox(automationId, triggerNodeId, cfg, password) {
  const scope = triggerNodeId || automationId;
  const eventType = cfg.eventType || cfg.watchType || "new_email";
  const spec = IMAP_EVENTS[eventType] || IMAP_EVENTS.new_email;
  // Dynamic import — imapflow is optional dep, only loaded if IMAP trigger is used
  let ImapFlow;
  try {
    ({ ImapFlow } = await import("imapflow"));
  } catch {
    throw new Error(
      "imapflow package not installed. Run: cd apps/backend && npm install imapflow",
    );
  }

  assertSafeHost(cfg.imapHost);
  const client = new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort || 993,
    secure: true,
    auth: { user: cfg.imapUser, pass: password },
    logger: false,
  });

  // Declared outside the try so the finally can release; only release if acquired,
  // otherwise a skipped tick would free the lock the other worker still holds.
  const pollLockKey = `bb:imap:lock:${scope}`;
  let pollLocked = false;

  await client.connect();

  try {
    const mailbox = await client.mailboxOpen(cfg.mailbox || "INBOX");

    // Track last processed UID in Redis to avoid re-processing.
    // Use a per-automation lock so concurrent workers don't both read the same
    // watermark and double-process the same messages.
    const uidKey = `bb:imap:uid:${scope}`;
    pollLocked = await acquireLock(pollLockKey, "poller", 120);
    if (!pollLocked) {
      console.warn(`[IMAP] Automation ${automationId} already polling, skipping concurrent tick`);
      return;
    }
    const lastUid = parseInt(await redis.get(uidKey) || "0", 10);
    const searchCriteria = cfg.onlyUnread !== false ? ["UNSEEN"] : ["ALL"];

    const messages = [];
    for await (const msg of client.fetch(searchCriteria, {
      envelope: true,
      bodyStructure: true,
      source: true,
      uid: true,
    })) {
      if (msg.uid <= lastUid) continue;
      messages.push(msg);
    }

    if (!messages.length) return;

    const { executeAutomation } = await import(
      "../modules/automation/automation.executor.js"
    );
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    let maxUid = lastUid;

    for (const msg of messages) {
      if (msg.uid > maxUid) maxUid = msg.uid;

      const source = msg.source?.toString() || "";

      const attachments = [];
      const sizeRef = { size: 0 };
      walkStructure(msg.bodyStructure, attachments, sizeRef);

      // Simple text/html extraction from raw RFC822 source
      const emailPayload = {
        from: msg.envelope?.from?.[0]?.address || "",
        to: (msg.envelope?.to || []).map((a) => a.address).join(", "),
        cc: (msg.envelope?.cc || []).map((a) => a.address).join(", "),
        subject: msg.envelope?.subject || "",
        date: msg.envelope?.date?.toISOString() || new Date().toISOString(),
        messageId: msg.envelope?.messageId || "",
        text: extractBodyPart(source, "text/plain"),
        html: extractBodyPart(source, "text/html"),
        attachments,
        attachmentCount: attachments.length,
        sizeBytes: sizeRef.size || source.length,
      };

      if (!spec.match(emailPayload, cfg)) continue;

      try {
        await executeAutomation(
          automation,
          { email: emailPayload },
          { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `imap:${scope}:${eventType}:${msg.uid}` },
        );
        console.log(`[IMAP] Fired "${automation.name}" for email: "${emailPayload.subject}"`);

        if (cfg.markRead !== false) {
          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], { uid: true });
        }
      } catch (err) {
        console.error(`[IMAP] Failed to fire automation "${automation.name}":`, err.message);
      }
    }

    // Persist highest UID so next poll skips already-processed messages
    if (maxUid > lastUid) {
      await redis.set(uidKey, String(maxUid));
    }
  } finally {
    await client.logout().catch(() => {});
    if (pollLocked) await releaseLock(pollLockKey, "poller");
  }
}

function extractBodyPart(raw, mimeType) {
  // Minimal extraction: find boundary, split, grab matching part
  // This is best-effort — for production, imapflow's bodyPart fetch is more reliable
  const lower = raw.toLowerCase();
  const idx = lower.indexOf(`content-type: ${mimeType}`);
  if (idx === -1) return "";
  const after = raw.slice(idx);
  const bodyStart = after.indexOf("\r\n\r\n");
  if (bodyStart === -1) return "";
  const body = after.slice(bodyStart + 4);
  const boundaryEnd = body.indexOf("\r\n--");
  return (boundaryEnd !== -1 ? body.slice(0, boundaryEnd) : body).trim();
}

// ── BullMQ setup ──────────────────────────────────────────────────────────────

export async function startImapPoller() {
  console.log("[IMAPPoller] Starting...");

  imapQueue = new Queue(IMAP_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });

  imapWorker = new Worker(
    IMAP_QUEUE_NAME,
    async (job) => {
      const { automationId, cfg, credentialId } = job.data;

      // Resolve password from vault at runtime
      let password = "";
      if (credentialId) {
        try {
          const { resolveCredential } = await import("../modules/credentials/credential.service.js");
          const cred = await resolveCredential(credentialId);
          password = cred?.value || cred?.password || "";
        } catch (err) {
          console.error(`[IMAP] Credential resolution failed for ${automationId}:`, err.message);
          return;
        }
      }

      await pollMailbox(automationId, job.data.triggerNodeId || null, cfg, password);
    },
    { connection: createBullMQConnection(), concurrency: 2 },
  );

  imapWorker.on("failed", (job, err) => {
    console.error(`[IMAPPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncImapJobs();
  console.log("[IMAPPoller] Ready");
}

export async function syncImapJobs() {
  if (!imapQueue) return;

  const existing = await imapQueue.getRepeatableJobs();
  for (const job of existing) {
    await imapQueue.removeRepeatableByKey(job.key);
  }

  const imapAutomations = await Automation.find({ trigger: "imap_trigger", active: true });

  for (const automation of imapAutomations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const pollInterval = cfg.pollInterval || "*/5 * * * *";

    if (!cfg.imapHost || !cfg.imapUser) {
      console.warn(`[IMAPPoller] Automation ${automation._id} missing IMAP config, skipping`);
      continue;
    }

    await imapQueue.add(
      "imap-poll",
      {
        automationId: automation._id.toString(),
        cfg,
        credentialId: cfg.credentialId || null,
      },
      { repeat: { pattern: pollInterval }, jobId: `imap-${automation._id}` },
    );

    console.log(`[IMAPPoller] Registered: "${automation.name}" → ${cfg.imapHost}/${cfg.mailbox || "INBOX"}`);
  }

  console.log(`[IMAPPoller] Synced ${imapAutomations.length} IMAP automations`);
}

export async function addImapJob(automationId, cfg, credentialId, pollInterval) {
  if (!imapQueue) return;
  await imapQueue.add(
    "imap-poll",
    { automationId: automationId.toString(), cfg, credentialId },
    { repeat: { pattern: pollInterval || "*/5 * * * *" }, jobId: `imap-${automationId}` },
  );
}

export async function removeImapJob(automationId) {
  if (!imapQueue) return;
  const jobs = await imapQueue.getRepeatableJobs();
  for (const job of jobs) {
    if (job.id === `imap-${automationId}`) {
      await imapQueue.removeRepeatableByKey(job.key);
    }
  }
}

export async function stopImapPoller() {
  if (imapWorker) await imapWorker.close();
  if (imapQueue) await imapQueue.close();
  imapWorker = null;
  imapQueue = null;
}

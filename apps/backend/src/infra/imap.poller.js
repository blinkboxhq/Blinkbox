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

export async function pollMailbox(automationId, triggerNodeId, cfg, password) {
  const scope = triggerNodeId || automationId;
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

  await client.connect();

  try {
    const mailbox = await client.mailboxOpen(cfg.mailbox || "INBOX");

    // Track last processed UID in Redis to avoid re-processing.
    // Use a per-automation lock so concurrent workers don't both read the same
    // watermark and double-process the same messages.
    const uidKey = `bb:imap:uid:${scope}`;
    const pollLockKey = `bb:imap:lock:${scope}`;
    const pollLocked = await acquireLock(pollLockKey, "poller", 120);
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

      // Simple text/html extraction from raw RFC822 source
      const emailPayload = {
        from: msg.envelope?.from?.[0]?.address || "",
        to: (msg.envelope?.to || []).map((a) => a.address).join(", "),
        subject: msg.envelope?.subject || "",
        date: msg.envelope?.date?.toISOString() || new Date().toISOString(),
        messageId: msg.envelope?.messageId || "",
        text: extractBodyPart(source, "text/plain"),
        html: extractBodyPart(source, "text/html"),
        attachments: [], // Attachment metadata (not contents — keep payloads lean)
      };

      try {
        await executeAutomation(
          automation,
          { email: emailPayload },
          { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `imap:${scope}:${msg.uid}` },
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
    await releaseLock(pollLockKey, "poller");
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

      await pollMailbox(automationId, cfg, password);
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

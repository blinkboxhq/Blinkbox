/**
 * SSL Certificate Expiry Poller
 * Checks TLS cert expiry for a domain. Fires when cert expires within N days.
 * State-change aware — fires once on entry, not every check.
 * Dedup: fires per (domain, threshold) crossing.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import tls from "tls";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-ssl-poller";
let sslQueue = null;
let sslWorker = null;

function checkCert(host, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      if (!cert || !cert.valid_to) return reject(new Error("No certificate returned"));
      const expiresAt = new Date(cert.valid_to);
      const daysLeft = Math.floor((expiresAt - Date.now()) / 86400000);
      resolve({ host, expiresAt: expiresAt.toISOString(), daysLeft, subject: cert.subject?.CN || host, issuer: cert.issuer?.O || "" });
    });
    socket.on("error", reject);
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("TLS timeout")); });
  });
}

export async function pollSslCert(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ssl:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const host = cfg.host || cfg.hostname;
    const { port = 443, warnDays = cfg.warningDays ?? 14 } = cfg;
    if (!host) return;
    assertSafeHost(host);
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const result = await checkCert(host, parseInt(port));
    if (result.daysLeft > parseInt(warnDays)) return;

    // Fire once per expiry window (reset when cert renews)
    const stateKey = `bb:ssl:fired:${scope}:${Math.floor(result.daysLeft / 7)}`;
    const alreadyFired = await redis.get(stateKey);
    if (alreadyFired) return;
    await redis.set(stateKey, "1", "EX", 7 * 24 * 60 * 60);

    await executeAutomation(automation, result, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `ssl:${scope}:${result.daysLeft}`,
    });
  } catch (err) {
    console.warn(`[SslPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startSslPoller() {
  console.log("[SslPoller] Starting...");
  sslQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  sslWorker = new Worker(QUEUE_NAME, async (job) => { await pollSslCert(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 8 });
  sslWorker.on("failed", (job, err) => console.error(`[SslPoller] Job failed:`, err.message));
  await syncSslJobs();
  console.log("[SslPoller] Ready");
}

export async function syncSslJobs() {
  if (!sslQueue) return;
  const existing = await sslQueue.getRepeatableJobs();
  for (const job of existing) await sslQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "ssl_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const host = cfg.host || cfg.hostname;
    if (!host) continue;
    await sslQueue.add("ssl-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { host, port: cfg.port, warnDays: cfg.warnDays || cfg.warningDays } }, { repeat: { every: 12 * 60 * 60 * 1000 }, jobId: `ssl-${automation._id}` });
  }
  console.log(`[SslPoller] Synced ${automations.length} automations`);
}

export async function stopSslPoller() {
  if (sslWorker) await sslWorker.close();
  if (sslQueue) await sslQueue.close();
  sslWorker = null; sslQueue = null;
}

/**
 * SSL Certificate Poller
 * Inspects the TLS cert for a host each poll and fires one of 12 distinct
 * lifecycle events. Snapshots fingerprint/issuer/SAN/daysLeft in Redis so
 * renewals, issuer swaps and recovery transitions can be diffed.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import tls from "tls";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-ssl-poller";
const SNAP_TTL = 90 * 24 * 60 * 60;
const SEEN_TTL = 90 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

let sslQueue = null;
let sslWorker = null;

// Pull the full peer certificate (not just valid_to) so per-field events —
// fingerprint renewal, issuer/SAN change, CN mismatch — can diff against the
// snapshot. rejectUnauthorized:false lets us inspect expired/self-signed certs.
function checkCert(host, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate(true);
      const authorized = socket.authorized;
      const authError = socket.authorizationError ? String(socket.authorizationError) : "";
      socket.destroy();
      if (!cert || !cert.valid_to) return reject(new Error("No certificate returned"));
      const expiresAt = new Date(cert.valid_to);
      const issuedAt = cert.valid_from ? new Date(cert.valid_from) : null;
      const daysLeft = Math.floor((expiresAt - Date.now()) / 86400000);
      const ageDays = issuedAt ? Math.floor((Date.now() - issuedAt) / 86400000) : 999;
      const san = (cert.subjectaltname || "").split(",").map((s) => s.trim()).sort().join(",");
      const cn = cert.subject?.CN || "";
      const issuerCN = cert.issuer?.CN || "";
      const selfSigned = !!cn && cn === issuerCN;
      const sanHosts = san.split(",").map((s) => s.replace(/^DNS:/i, "").toLowerCase());
      const cnMismatch =
        lc(cn) !== lc(host) &&
        !sanHosts.includes(lc(host)) &&
        !sanHosts.some((d) => d.startsWith("*.") && lc(host).endsWith(d.slice(1)));
      resolve({
        host,
        expiresAt: expiresAt.toISOString(),
        issuedAt: issuedAt ? issuedAt.toISOString() : "",
        daysLeft,
        ageDays,
        subject: cn || host,
        issuer: cert.issuer?.O || issuerCN || "",
        fingerprint: cert.fingerprint256 || cert.fingerprint || "",
        san,
        selfSigned,
        cnMismatch,
        authorized,
        authError,
      });
    });
    socket.on("error", reject);
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("TLS timeout")); });
  });
}

// Each event is a predicate over the current cert (`r`), its previous snapshot
// (`prev`, may be null) and config (`c`). `needsPrev` events stay quiet until a
// baseline exists. dedup keeps each crossing firing once until the underlying
// value changes again.
const SSL_EVENTS = {
  expiring_soon:  { needsPrev: false, dedup: (r, c) => `soon:${r.fingerprint}:${r.daysLeft <= Number(c.warnDays || 14)}`, match: (r, _p, c) => r.daysLeft <= Number(c.warnDays || 14) && r.daysLeft >= 0 },
  expires_30d:    { needsPrev: false, dedup: (r) => `30:${r.fingerprint}`, match: (r) => r.daysLeft <= 30 && r.daysLeft >= 0 },
  expires_7d:     { needsPrev: false, dedup: (r) => `7:${r.fingerprint}`,  match: (r) => r.daysLeft <= 7 && r.daysLeft >= 0 },
  expires_1d:     { needsPrev: false, dedup: (r) => `1:${r.fingerprint}`,  match: (r) => r.daysLeft <= 1 && r.daysLeft >= 0 },
  expired:        { needsPrev: false, dedup: (r) => `exp:${r.fingerprint}`, match: (r) => r.daysLeft < 0 },
  renewed:        { needsPrev: true,  dedup: (r) => `fp:${r.fingerprint}`, match: (r, prev) => !!prev.fingerprint && r.fingerprint !== prev.fingerprint },
  issuer_changed: { needsPrev: true,  dedup: (r) => `iss:${lc(r.issuer)}`, match: (r, prev) => !!prev.issuer && lc(r.issuer) !== lc(prev.issuer) },
  san_changed:    { needsPrev: true,  dedup: (r) => `san:${r.san}`,        match: (r, prev) => prev.san != null && r.san !== prev.san },
  newly_issued:   { needsPrev: false, dedup: (r) => `new:${r.fingerprint}`, match: (r) => r.ageDays <= 2 },
  self_signed:    { needsPrev: false, dedup: (r) => `self:${r.fingerprint}`, match: (r) => r.selfSigned },
  cn_mismatch:    { needsPrev: false, dedup: (r) => `cnm:${r.fingerprint}`, match: (r) => r.cnMismatch },
  valid_again:    { needsPrev: true,  dedup: (r) => `back:${r.fingerprint}`, match: (r, prev) => r.daysLeft >= 0 && Number(prev.daysLeft) < 0 },
};

export async function pollSslCert(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ssl:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const host = cfg.host || cfg.hostname;
    if (!host) return;
    assertSafeHost(host);
    const evType = cfg.eventType || cfg.watchType || "expiring_soon";
    const spec = SSL_EVENTS[evType] || SSL_EVENTS.expiring_soon;

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const result = await checkCert(host, parseInt(cfg.port || 443));

    const snapKey = `bb:ssl:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prev = prevRaw ? JSON.parse(prevRaw) : null;
    await redis.set(snapKey, JSON.stringify({ fingerprint: result.fingerprint, issuer: result.issuer, san: result.san, daysLeft: result.daysLeft }), "EX", SNAP_TTL);

    if (spec.needsPrev && !prev) return;
    const c = { warnDays: cfg.warnDays ?? cfg.warningDays ?? 14, targetValue: cfg.targetValue };
    if (!spec.match(result, prev || {}, c)) return;

    const dedup = spec.dedup(result, c);
    const seenKey = `bb:ssl:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    await executeAutomation(automation, { ...result, eventType: evType }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `ssl:${scope}:${evType}:${dedup}`,
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
    const intervalMin = Math.max(5, Math.round(
      cfg.pollIntervalMinutes ? parseInt(cfg.pollIntervalMinutes) : 360
    ));
    await sslQueue.add("ssl-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { host, port: cfg.port, eventType: cfg.eventType || cfg.watchType, warnDays: cfg.warnDays || cfg.warningDays, targetValue: cfg.targetValue },
    }, { repeat: { pattern: `*/${intervalMin} * * * *` }, jobId: `ssl-${automation._id}` });
  }
  console.log(`[SslPoller] Synced ${automations.length} automations`);
}

export async function stopSslPoller() {
  if (sslWorker) await sslWorker.close();
  if (sslQueue) await sslQueue.close();
  sslWorker = null; sslQueue = null;
}

/**
 * DNS Change Monitor
 * Resolves DNS records for a domain and fires when they change.
 * Stores last-known values in Redis. State-change aware.
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import dns from "dns/promises";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-dns-monitor";
let dnsQueue = null;
let dnsWorker = null;

async function resolveOne(domain, type) {
  try {
    switch (type) {
      case "A":     return (await dns.resolve4(domain)).sort().join(",");
      case "AAAA":  return (await dns.resolve6(domain)).sort().join(",");
      case "MX":    return (await dns.resolveMx(domain)).map(r => `${r.priority} ${r.exchange}`).sort().join(",");
      case "TXT":   return (await dns.resolveTxt(domain)).flat().sort().join(",");
      case "CNAME": return (await dns.resolveCname(domain)).sort().join(",");
      case "NS":    return (await dns.resolveNs(domain)).sort().join(",");
      default:      return "";
    }
  } catch { return ""; }
}

// Resolve every record type once per poll so per-record events can diff
// independently against the previous snapshot.
async function resolveAll(domain) {
  const types = ["A", "AAAA", "MX", "TXT", "CNAME", "NS"];
  const out = {};
  await Promise.all(types.map(async (t) => { out[t] = await resolveOne(domain, t); }));
  return out;
}

const lc = (s) => String(s ?? "").toLowerCase();
const recCount = (v) => (v ? v.split(",").filter(Boolean).length : 0);

// Each event compares the current resolution map (`cur`) against the previous
// snapshot (`prev`) and config (`c`). `needsPrev` events stay quiet on the first
// poll until a baseline exists.
const DNS_EVENTS = {
  a_changed:           { needsPrev: true,  dedup: (cur) => `A:${cur.A}`,         match: (cur, prev) => cur.A !== prev.A },
  aaaa_changed:        { needsPrev: true,  dedup: (cur) => `AAAA:${cur.AAAA}`,   match: (cur, prev) => cur.AAAA !== prev.AAAA },
  cname_changed:       { needsPrev: true,  dedup: (cur) => `CNAME:${cur.CNAME}`, match: (cur, prev) => cur.CNAME !== prev.CNAME },
  mx_changed:          { needsPrev: true,  dedup: (cur) => `MX:${cur.MX}`,       match: (cur, prev) => cur.MX !== prev.MX },
  txt_changed:         { needsPrev: true,  dedup: (cur) => `TXT:${cur.TXT}`,     match: (cur, prev) => cur.TXT !== prev.TXT },
  ns_changed:          { needsPrev: true,  dedup: (cur) => `NS:${cur.NS}`,       match: (cur, prev) => cur.NS !== prev.NS },
  any_changed:         { needsPrev: true,  dedup: (cur) => `any:${JSON.stringify(cur)}`, match: (cur, prev) => JSON.stringify(cur) !== JSON.stringify(prev) },
  resolves_to:         { needsPrev: false, dedup: (cur, c) => `to:${c.targetValue}:${cur.A.includes(c.targetValue) || cur.AAAA.includes(c.targetValue)}`, match: (cur, _p, c) => `${cur.A},${cur.AAAA}`.split(",").includes(c.targetValue) },
  no_longer_resolves:  { needsPrev: true,  dedup: (cur) => `gone:${cur.A}${cur.AAAA}`, match: (cur, prev) => (prev.A || prev.AAAA) && !cur.A && !cur.AAAA },
  started_resolving:   { needsPrev: true,  dedup: (cur) => `up:${cur.A}${cur.AAAA}`, match: (cur, prev) => !(prev.A || prev.AAAA) && (cur.A || cur.AAAA) },
  mx_set:              { needsPrev: false, dedup: (cur) => `mxset:${cur.MX}`,     match: (cur, _p, c) => recCount(cur.MX) > 0 && (!c.targetValue || lc(cur.MX).includes(lc(c.targetValue))) },
  record_count_changed:{ needsPrev: true,  dedup: (cur) => `cnt:${recCount(cur.A)}`, match: (cur, prev) => recCount(cur.A) !== recCount(prev.A) },
};

export async function pollDns(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:dns:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const domain = cfg.domain || cfg.hostname;
    if (!domain) return;
    assertSafeHost(domain);
    const evType = cfg.eventType || cfg.watchType || "any_changed";
    const spec = DNS_EVENTS[evType] || DNS_EVENTS.any_changed;

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const cur = await resolveAll(domain);
    const snapKey = `bb:dns:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prev = prevRaw ? JSON.parse(prevRaw) : null;
    await redis.set(snapKey, JSON.stringify(cur), "EX", 30 * 24 * 60 * 60);

    if (spec.needsPrev && !prev) return;
    const c = { targetValue: cfg.targetValue };
    if (!spec.match(cur, prev || {}, c)) return;

    const dedup = spec.dedup(cur, c);
    const seenKey = `bb:dns:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, 30 * 24 * 60 * 60);

    await executeAutomation(automation, {
      domain, eventType: evType,
      A: cur.A, AAAA: cur.AAAA, MX: cur.MX, TXT: cur.TXT, CNAME: cur.CNAME, NS: cur.NS,
      previous: prev || {}, changedAt: new Date().toISOString(),
    }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `dns:${scope}:${evType}:${dedup}`,
    });
  } catch (err) {
    console.warn(`[DnsMonitor] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startDnsMonitor() {
  console.log("[DnsMonitor] Starting...");
  dnsQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  dnsWorker = new Worker(QUEUE_NAME, async (job) => { await pollDns(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 8 });
  dnsWorker.on("failed", (job, err) => console.error(`[DnsMonitor] Job failed:`, err.message));
  await syncDnsJobs();
  console.log("[DnsMonitor] Ready");
}

export async function syncDnsJobs() {
  if (!dnsQueue) return;
  const existing = await dnsQueue.getRepeatableJobs();
  for (const job of existing) await dnsQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "dns_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const domain = cfg.domain || cfg.hostname;
    if (!domain) continue;
    const intervalMin = Math.max(1, Math.round(
      cfg.pollIntervalMinutes ? parseInt(cfg.pollIntervalMinutes) :
      cfg.pollIntervalSeconds ? parseInt(cfg.pollIntervalSeconds) / 60 : 15
    ));
    await dnsQueue.add("dns-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { domain, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue } }, { repeat: { pattern: `*/${intervalMin} * * * *` }, jobId: `dns-${automation._id}` });
  }
  console.log(`[DnsMonitor] Synced ${automations.length} automations`);
}

export async function stopDnsMonitor() {
  if (dnsWorker) await dnsWorker.close();
  if (dnsQueue) await dnsQueue.close();
  dnsWorker = null; dnsQueue = null;
}

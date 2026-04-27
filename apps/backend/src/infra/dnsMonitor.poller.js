/**
 * DNS Change Monitor
 * Resolves DNS records for a domain and fires when they change.
 * Stores last-known values in Redis. State-change aware.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import dns from "dns/promises";

const QUEUE_NAME = "bb-dns-monitor";
let dnsQueue = null;
let dnsWorker = null;

async function resolve(domain, type) {
  try {
    switch (type) {
      case "A":     return (await dns.resolve4(domain)).join(",");
      case "AAAA":  return (await dns.resolve6(domain)).join(",");
      case "MX":    return (await dns.resolveMx(domain)).map(r => `${r.priority} ${r.exchange}`).join(",");
      case "TXT":   return (await dns.resolveTxt(domain)).flat().join(",");
      case "CNAME": return (await dns.resolveCname(domain)).join(",");
      case "NS":    return (await dns.resolveNs(domain)).join(",");
      default:      return (await dns.resolve4(domain)).join(",");
    }
  } catch { return ""; }
}

async function pollDns(automationId, cfg) {
  const lockKey = `bb:dns:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const domain = cfg.domain || cfg.hostname;
    const { recordType = "A" } = cfg;
    if (!domain) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const current = await resolve(domain, recordType);
    const stateKey = `bb:dns:last:${automationId}`;
    const previous = await redis.get(stateKey) || "";
    await redis.set(stateKey, current, "EX", 30 * 24 * 60 * 60);
    if (current === previous || previous === "") return;
    await executeAutomation(automation, { domain, recordType, current, previous, changedAt: new Date().toISOString() }, {
      workspaceId: automation.workspaceId,
      idempotencyKey: `dns:${automationId}:${Date.now()}`,
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
  dnsWorker = new Worker(QUEUE_NAME, async (job) => { await pollDns(job.data.automationId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 8 });
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
    await dnsQueue.add("dns-poll", { automationId: automation._id.toString(), cfg: { domain, recordType: cfg.recordType } }, { repeat: { pattern: `*/${intervalMin} * * * *` }, jobId: `dns-${automation._id}` });
  }
  console.log(`[DnsMonitor] Synced ${automations.length} automations`);
}

export async function stopDnsMonitor() {
  if (dnsWorker) await dnsWorker.close();
  if (dnsQueue) await dnsQueue.close();
  dnsWorker = null; dnsQueue = null;
}

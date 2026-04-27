/**
 * TCP Port Monitor
 * Checks if a TCP port is open/closed. Fires on state change.
 * Great for detecting service outages, port scans, or unexpected open ports.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import net from "net";

const QUEUE_NAME = "bb-port-monitor";
let portQueue = null;
let portWorker = null;

function checkPort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => { socket.destroy(); resolve({ open: true, responseTime: Date.now() - start }); });
    socket.on("timeout", () => { socket.destroy(); resolve({ open: false, responseTime: Date.now() - start, reason: "timeout" }); });
    socket.on("error", (err) => { resolve({ open: false, responseTime: Date.now() - start, reason: err.message }); });
    socket.connect(port, host);
  });
}

async function pollPort(automationId, cfg) {
  const lockKey = `bb:port:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const { host, port, alertOn = "closed" } = cfg;
    if (!host || !port) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const result = await checkPort(host, parseInt(port));
    const stateKey = `bb:port:state:${automationId}`;
    const lastState = await redis.get(stateKey) || "unknown";
    const currentState = result.open ? "open" : "closed";
    await redis.set(stateKey, currentState, "EX", 7 * 24 * 60 * 60);
    const shouldFire =
      (alertOn === "closed" && currentState === "closed") ||
      (alertOn === "open" && currentState === "open" && lastState === "closed") ||
      (alertOn === "change" && currentState !== lastState && lastState !== "unknown");
    if (!shouldFire) return;
    await executeAutomation(automation, { host, port: parseInt(port), state: currentState, previousState: lastState, responseTime: result.responseTime, reason: result.reason || null, checkedAt: new Date().toISOString() }, {
      workspaceId: automation.workspaceId,
      idempotencyKey: `port:${automationId}:${currentState}:${Date.now()}`,
    });
  } catch (err) {
    console.warn(`[PortMonitor] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startPortMonitor() {
  console.log("[PortMonitor] Starting...");
  portQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  portWorker = new Worker(QUEUE_NAME, async (job) => { await pollPort(job.data.automationId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 12 });
  portWorker.on("failed", (job, err) => console.error(`[PortMonitor] Job failed:`, err.message));
  await syncPortJobs();
  console.log("[PortMonitor] Ready");
}

export async function syncPortJobs() {
  if (!portQueue) return;
  const existing = await portQueue.getRepeatableJobs();
  for (const job of existing) await portQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "port_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.host || !cfg.port) continue;
    const intervalSec = parseInt(cfg.pollIntervalSeconds) || 60;
    await portQueue.add("port-poll", { automationId: automation._id.toString(), cfg: { host: cfg.host, port: cfg.port, alertOn: cfg.alertOn } }, { repeat: { every: intervalSec * 1000 }, jobId: `port-${automation._id}` });
  }
  console.log(`[PortMonitor] Synced ${automations.length} automations`);
}

export async function stopPortMonitor() {
  if (portWorker) await portWorker.close();
  if (portQueue) await portQueue.close();
  portWorker = null; portQueue = null;
}

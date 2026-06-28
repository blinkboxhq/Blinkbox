/**
 * HTTP Monitor Poller
 * Checks a URL for status code, response time, and keyword presence.
 * Fires when the site goes down (non-2xx), comes back up, or response time spikes.
 * Dedup: fires on STATE CHANGE only — tracks last state in Redis.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeUrl } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-http-monitor";
let monitorQueue = null;
let monitorWorker = null;

async function checkUrl(url, expectedKeyword, timeoutMs = 10000) {
  assertSafeUrl(url);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    const responseTime = Date.now() - start;
    const text = await res.text();
    const keywordFound = expectedKeyword ? text.includes(expectedKeyword) : true;
    return {
      status: res.status,
      ok: res.ok && keywordFound,
      responseTime,
      reason: !res.ok ? `HTTP ${res.status}` : !keywordFound ? `Keyword "${expectedKeyword}" not found` : "ok",
    };
  } catch (err) {
    return { status: 0, ok: false, responseTime: Date.now() - start, reason: err.message };
  }
}

export async function pollHttpMonitor(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:httpmon:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const { url, expectedKeyword, alertOn = "down", maxResponseMs } = cfg;
    if (!url) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const result = await checkUrl(url, expectedKeyword);
    const stateKey = `bb:httpmon:state:${scope}`;
    const lastState = await redis.get(stateKey) || "unknown";
    const currentState = result.ok && (!maxResponseMs || result.responseTime < maxResponseMs) ? "up" : "down";
    await redis.set(stateKey, currentState, "EX", 7 * 24 * 60 * 60);

    const shouldFire =
      (alertOn === "down" && currentState === "down") ||
      (alertOn === "up" && currentState === "up" && lastState === "down") ||
      (alertOn === "both" && currentState !== lastState) ||
      (alertOn === "slow" && maxResponseMs && result.responseTime > maxResponseMs);

    if (!shouldFire) return;

    await executeAutomation(automation, {
      url, status: result.status, ok: result.ok, responseTime: result.responseTime,
      state: currentState, previousState: lastState, reason: result.reason,
      checkedAt: new Date().toISOString(),
    }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `httpmon:${scope}:${currentState}:${new Date().toISOString().slice(0, 13)}`,
    });
  } catch (err) {
    console.warn(`[HttpMonitor] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startHttpMonitor() {
  console.log("[HttpMonitor] Starting...");
  monitorQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  monitorWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollHttpMonitor(job.data.automationId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 8 });
  monitorWorker.on("failed", (job, err) => console.error(`[HttpMonitor] Job failed:`, err.message));
  await syncHttpMonitorJobs();
  console.log("[HttpMonitor] Ready");
}

export async function syncHttpMonitorJobs() {
  if (!monitorQueue) return;
  const existing = await monitorQueue.getRepeatableJobs();
  for (const job of existing) await monitorQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "http_monitor_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.url) continue;
    const intervalSeconds = parseInt(cfg.pollIntervalSeconds) || 60;
    await monitorQueue.add("http-monitor", {
      automationId: automation._id.toString(),
      cfg: { url: cfg.url, expectedKeyword: cfg.expectedKeyword, alertOn: cfg.alertOn, maxResponseMs: cfg.maxResponseMs },
    }, { repeat: { every: intervalSeconds * 1000 }, jobId: `httpmon-${automation._id}` });
  }
  console.log(`[HttpMonitor] Synced ${automations.length} automations`);
}

export async function stopHttpMonitor() {
  if (monitorWorker) await monitorWorker.close();
  if (monitorQueue) await monitorQueue.close();
  monitorWorker = null; monitorQueue = null;
}

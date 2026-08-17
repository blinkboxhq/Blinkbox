/**
 * HTTP Monitor Poller
 * Checks a URL for status code, response time, and keyword presence.
 * Fires when the site goes down (non-2xx), comes back up, or response time spikes.
 * Dedup: fires on STATE CHANGE only — tracks last state in Redis.
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeUrl } from "../utils/ssrf.js";
import crypto from "crypto";

const QUEUE_NAME = "bb-http-monitor";
const STATE_TTL = 7 * 24 * 60 * 60;
const SEEN_TTL = 7 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

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
    const redirected = res.status >= 300 && res.status < 400;
    return {
      status: res.status,
      ok: res.ok && keywordFound,
      responseTime,
      keywordFound,
      redirected,
      location: res.headers.get("location") || "",
      bodyHash: crypto.createHash("sha1").update(text).digest("hex"),
      reason: !res.ok ? `HTTP ${res.status}` : !keywordFound ? `Keyword "${expectedKeyword}" not found` : "ok",
    };
  } catch (err) {
    return { status: 0, ok: false, responseTime: Date.now() - start, keywordFound: false, redirected: false, location: "", bodyHash: "", reason: err.message };
  }
}

// Each event is a predicate over the current check (`r`), the previous "up"/"down"
// state (`state`), and config (`c`). `needsState` events compare against the prior
// state to catch transitions; `dedup` keeps each outcome firing once until it flips.
const HTTP_EVENTS = {
  is_down:         { needsState: false, dedup: (r, _s) => `down:${r.status}`, match: (r) => !r.ok },
  is_up:           { needsState: true,  dedup: () => `up`, match: (r, s) => r.ok && s === "down" },
  recovered:       { needsState: true,  dedup: () => `rec`, match: (r, s) => r.ok && s === "down" },
  status_is:       { needsState: false, dedup: (r) => `s:${r.status}`, match: (r, _s, c) => Number(r.status) === Number(c.targetValue) },
  status_2xx:      { needsState: false, dedup: (r) => `2xx:${r.status}`, match: (r) => r.status >= 200 && r.status < 300 },
  status_4xx:      { needsState: false, dedup: (r) => `4xx:${r.status}`, match: (r) => r.status >= 400 && r.status < 500 },
  status_5xx:      { needsState: false, dedup: (r) => `5xx:${r.status}`, match: (r) => r.status >= 500 && r.status < 600 },
  slow_response:   { needsState: false, dedup: (r, _s, c) => `slow:${r.responseTime > Number(c.maxResponseMs || c.targetValue || 3000)}`, match: (r, _s, c) => r.responseTime > Number(c.maxResponseMs || c.targetValue || 3000) },
  keyword_present: { needsState: false, dedup: (r) => `kw:${r.keywordFound}`, match: (r) => r.status > 0 && r.keywordFound },
  keyword_missing: { needsState: false, dedup: (r) => `nokw:${!r.keywordFound}`, match: (r) => r.status > 0 && !r.keywordFound },
  redirected:      { needsState: false, dedup: (r) => `redir:${lc(r.location)}`, match: (r) => r.redirected },
  content_changed: { needsState: false, dedup: (r) => `body:${r.bodyHash}`, match: (r, _s, c) => !!r.bodyHash && !!c.lastBodyHash && r.bodyHash !== c.lastBodyHash },
};

export async function pollHttpMonitor(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:httpmon:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const { url, expectedKeyword, maxResponseMs } = cfg;
    if (!url) return;
    // `alertOn` was the legacy single-event selector; honour it as a fallback.
    const legacyMap = { down: "is_down", up: "is_up", both: "is_down", slow: "slow_response" };
    const evType = cfg.eventType || cfg.watchType || legacyMap[cfg.alertOn] || "is_down";
    const spec = HTTP_EVENTS[evType] || HTTP_EVENTS.is_down;

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const result = await checkUrl(url, expectedKeyword);

    const stateKey = `bb:httpmon:state:${scope}`;
    const lastState = await redis.get(stateKey) || "unknown";
    const currentState = result.ok ? "up" : "down";
    await redis.set(stateKey, currentState, "EX", STATE_TTL);

    const bodyKey = `bb:httpmon:body:${scope}`;
    const lastBodyHash = await redis.get(bodyKey);
    if (result.bodyHash) await redis.set(bodyKey, result.bodyHash, "EX", STATE_TTL);

    if (spec.needsState && lastState === "unknown") return;
    const c = { targetValue: cfg.targetValue, maxResponseMs, lastBodyHash };
    if (!spec.match(result, lastState, c)) return;

    const dedup = spec.dedup(result, lastState, c);
    const seenKey = `bb:httpmon:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    await executeAutomation(automation, {
      url, status: result.status, ok: result.ok, responseTime: result.responseTime,
      state: currentState, previousState: lastState, reason: result.reason,
      location: result.location, eventType: evType, checkedAt: new Date().toISOString(),
    }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `httpmon:${scope}:${evType}:${dedup}`,
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
    await pollHttpMonitor(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
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
      triggerNodeId: automation.entryNodeId,
      cfg: { url: cfg.url, expectedKeyword: cfg.expectedKeyword, alertOn: cfg.alertOn, maxResponseMs: cfg.maxResponseMs, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }, { repeat: { every: intervalSeconds * 1000 }, jobId: `httpmon-${automation._id}` });
  }
  console.log(`[HttpMonitor] Synced ${automations.length} automations`);
}

export async function stopHttpMonitor() {
  if (monitorWorker) await monitorWorker.close();
  if (monitorQueue) await monitorQueue.close();
  monitorWorker = null; monitorQueue = null;
}

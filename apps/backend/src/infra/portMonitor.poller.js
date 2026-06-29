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
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-port-monitor";
const STATE_TTL = 7 * 24 * 60 * 60;
const SEEN_TTL = 7 * 24 * 60 * 60;
const FLAP_WINDOW = 60 * 60; // count open/closed flips over the last hour
let portQueue = null;
let portWorker = null;

function checkPort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => { socket.destroy(); resolve({ open: true, responseTime: Date.now() - start, reason: "" }); });
    socket.on("timeout", () => { socket.destroy(); resolve({ open: false, responseTime: Date.now() - start, reason: "timeout" }); });
    socket.on("error", (err) => { resolve({ open: false, responseTime: Date.now() - start, reason: err.code || err.message }); });
    socket.connect(port, host);
  });
}

// Each event is a predicate over the current check (`r` = {open,responseTime,reason}),
// previous state (`s`), config (`c`, with `flips` = flap count in window). `needsState`
// events compare against the prior state to catch transitions.
const PORT_EVENTS = {
  port_open:      { needsState: false, dedup: (_r, _s, c) => `open:${c.flips}`, match: (r) => r.open },
  port_closed:    { needsState: false, dedup: (_r, _s, c) => `closed:${c.flips}`, match: (r) => !r.open },
  went_down:      { needsState: true,  dedup: (_r, _s, c) => `down:${c.flips}`, match: (r, s) => !r.open && s === "open" },
  came_up:        { needsState: true,  dedup: (_r, _s, c) => `up:${c.flips}`, match: (r, s) => r.open && s === "closed" },
  state_changed:  { needsState: true,  dedup: (_r, _s, c) => `chg:${c.flips}`, match: (r, s) => (r.open ? "open" : "closed") !== s },
  slow_connect:   { needsState: false, dedup: (r, _s, c) => `slow:${r.responseTime >= Number(c.targetValue || 1000)}`, match: (r, _s, c) => r.open && r.responseTime >= Number(c.targetValue || 1000) },
  fast_connect:   { needsState: false, dedup: (r, _s, c) => `fast:${r.responseTime < Number(c.targetValue || 100)}`, match: (r, _s, c) => r.open && r.responseTime < Number(c.targetValue || 100) },
  response_over:  { needsState: false, dedup: (r) => `ro:${r.responseTime}`, match: (r, _s, c) => r.responseTime >= Number(c.targetValue || 1000) },
  timed_out:      { needsState: false, dedup: (r) => `to:${r.reason}`, match: (r) => !r.open && r.reason === "timeout" },
  refused:        { needsState: false, dedup: (r) => `ref:${r.reason}`, match: (r) => !r.open && String(r.reason).includes("ECONNREFUSED") },
  flapping:       { needsState: false, dedup: (_r, _s, c) => `flap:${c.flips}`, match: (_r, _s, c) => c.flips >= Number(c.targetValue || 4) },
  recovered_fast: { needsState: true,  dedup: (_r, _s, c) => `recfast:${c.flips}`, match: (r, s, c) => r.open && s === "closed" && r.responseTime < Number(c.targetValue || 100) },
};

export async function pollPort(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:port:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 30);
  if (!locked) return;
  try {
    const { host, port } = cfg;
    if (!host || !port) return;
    assertSafeHost(host);
    const legacyMap = { closed: "port_closed", open: "came_up", change: "state_changed" };
    const evType = cfg.eventType || cfg.watchType || legacyMap[cfg.alertOn] || "state_changed";
    const spec = PORT_EVENTS[evType] || PORT_EVENTS.state_changed;

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const result = await checkPort(host, parseInt(port));
    const currentState = result.open ? "open" : "closed";

    const stateKey = `bb:port:state:${scope}`;
    const lastState = await redis.get(stateKey) || "unknown";
    await redis.set(stateKey, currentState, "EX", STATE_TTL);

    // Track flips in a rolling window for the flapping event.
    let flips = 0;
    if (lastState !== "unknown" && currentState !== lastState) {
      const flapKey = `bb:port:flaps:${scope}`;
      flips = await redis.incr(flapKey);
      if (flips === 1) await redis.expire(flapKey, FLAP_WINDOW);
    } else {
      flips = parseInt(await redis.get(`bb:port:flaps:${scope}`)) || 0;
    }

    if (spec.needsState && lastState === "unknown") return;
    const c = { targetValue: cfg.targetValue, flips };
    if (!spec.match(result, lastState, c)) return;

    const dedup = spec.dedup(result, lastState, c);
    const seenKey = `bb:port:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    await executeAutomation(automation, {
      host, port: parseInt(port), state: currentState, previousState: lastState,
      responseTime: result.responseTime, reason: result.reason || null,
      flips, eventType: evType, checkedAt: new Date().toISOString(),
    }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `port:${scope}:${evType}:${dedup}`,
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
  portWorker = new Worker(QUEUE_NAME, async (job) => { await pollPort(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 12 });
  portWorker.on("failed", (job, err) => console.error(`[PortMonitor] Job failed:`, err.message));
  await syncPortJobs();
  console.log("[PortMonitor] Ready");
}

export async function syncPortJobs() {
  if (!portQueue) return;
  const existing = await portQueue.getRepeatableJobs();
  for (const job of existing) await portQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "port_monitor_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.host || !cfg.port) continue;
    const intervalSec = parseInt(cfg.pollIntervalSeconds) || 60;
    await portQueue.add("port-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { host: cfg.host, port: cfg.port, alertOn: cfg.alertOn, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue } }, { repeat: { every: intervalSec * 1000 }, jobId: `port-${automation._id}` });
  }
  console.log(`[PortMonitor] Synced ${automations.length} automations`);
}

export async function stopPortMonitor() {
  if (portWorker) await portWorker.close();
  if (portQueue) await portQueue.close();
  portWorker = null; portQueue = null;
}

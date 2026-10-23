/**
 * Cron Scheduler Service
 *
 * One BullMQ job scheduler per Schedule trigger node, keyed
 * "cron:<automationId>:<nodeId>". Syncs reconcile the schedulers against
 * Mongo — upsert only what changed, remove what is gone — instead of wiping
 * and re-adding everything, so an edit never drops or doubles a slot.
 *
 * Every sync runs through one promise chain: a save, a toggle and the
 * periodic heal can overlap in time, and two reconciles interleaving their
 * reads and writes would undo each other.
 */

import parser from "cron-parser";
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import Automation from "../models/automation.model.js";
import { DEFAULT_TIMEZONE } from "../config/env.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";

const CRON_QUEUE_NAME = "bb-cron-scheduler";
const JOB_NAME = "cron-fire";
const SCHEDULER_PREFIX = "cron:";
const JOB_OPTS = { removeOnComplete: { count: 100 }, removeOnFail: { count: 500 } };
const WORKER_CONCURRENCY = 8;
const HEAL_INTERVAL_MS = 10 * 60 * 1000;
// Past this, an overdue slot with no live job means the chain broke (the worker
// failed to schedule the following job) and the scheduler never fires again.
const STUCK_AFTER_MS = 2 * 60 * 1000;
const SYNC_WAIT_MS = 5000;

const PRESET_CRON = {
  every_minute: "* * * * *",
  every_5m: "*/5 * * * *",
  every_15m: "*/15 * * * *",
  every_30m: "*/30 * * * *",
  every_hour: "0 * * * *",
  every_6h: "0 */6 * * *",
  every_12h: "0 */12 * * *",
};
const DAY_CRON = { Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6", Sun: "0" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FALLBACK_CRON = "0 * * * *";

// Keep in sync with liveCron in apps/frontend/src/pages/Workspace/triggerSchemas.js.
const clockPart = (value, fallback) => {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  return /^\d{1,2}$/.test(s) ? String(Number(s)) : s;
};

const dayList = (days) => {
  const list = Array.isArray(days) ? days : String(days ?? "").split(",");
  return list
    .map((d) => String(d).trim())
    .map((d) => DAY_CRON[d.slice(0, 1).toUpperCase() + d.slice(1, 3).toLowerCase()])
    .filter(Boolean)
    .join(",") || "*";
};

const squash = (pattern) => String(pattern ?? "").trim().replace(/\s+/g, " ");

function patternFor(cfg, automation) {
  const preset = cfg.preset;
  const hour = clockPart(cfg.dailyHour, "9");
  const minute = clockPart(cfg.dailyMinute, "0");
  if (preset === "custom") return squash(cfg.customCron || cfg.schedule) || FALLBACK_CRON;
  if (preset === "daily") return `${minute} ${hour} * * *`;
  if (preset === "weekly") return `${minute} ${hour} * * ${dayList(cfg.selectedDays ?? WEEKDAYS)}`;
  if (PRESET_CRON[preset]) return PRESET_CRON[preset];
  return squash(cfg.schedule || cfg.cronExpression || automation?.settings?.cronExpression) || FALLBACK_CRON;
}

/**
 * Resolve a Schedule trigger's config into the pattern + timezone BullMQ
 * should run. Pure: returns { pattern, tz } or { error } and never throws.
 */
export function resolveSchedule(cfg = {}, automation = {}) {
  const pattern = patternFor(cfg || {}, automation);
  const tz = String(cfg?.timezone || DEFAULT_TIMEZONE || "UTC").trim();

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { error: `unknown timezone "${tz}"` };
  }

  try {
    parser.parseExpression(pattern, { tz }).next();
  } catch (err) {
    return { error: `invalid cron "${pattern}": ${err.message}` };
  }

  return { pattern, tz };
}

export function schedulerIdFor(automationId, nodeId) {
  // BullMQ treats a repeat key with 5+ colon-separated parts as a legacy repeatable.
  return `${SCHEDULER_PREFIX}${automationId}:${String(nodeId).replace(/:/g, "_")}`;
}

/** Map of schedulerId → { id, automationId, nodeId, name, pattern, tz } for every valid cron node. */
export function desiredSchedulers(automations = [], log = console) {
  const desired = new Map();
  for (const automation of automations) {
    const automationId = String(automation._id);
    for (const node of getTriggerNodesOfType(automation, "cron_trigger")) {
      const resolved = resolveSchedule(getTriggerConfig(node), automation);
      if (resolved.error) {
        log.warn(`[CronScheduler] Not scheduling "${automation.name}" (${automationId}) node ${node.id}: ${resolved.error}`);
        continue;
      }
      const id = schedulerIdFor(automationId, node.id);
      desired.set(id, { id, automationId, nodeId: node.id, name: automation.name, ...resolved });
    }
  }
  return desired;
}

async function isStuck(queue, have, now) {
  if (!Number.isFinite(have?.next) || have.next >= now - STUCK_AFTER_MS) return false;
  // A still-queued overdue job is the catch-up after downtime and fires as soon as
  // a worker takes it; re-upserting would delete it.
  const job = await queue.getJob(`repeat:${have.key}:${have.next}`);
  if (!job) return true;
  const state = await job.getState();
  return state === "completed" || state === "failed" || state === "unknown";
}

/**
 * Bring the queue's cron schedulers in line with `desired`. With
 * `automationId`, only that automation's schedulers are touched.
 */
export async function reconcileSchedulers(queue, desired, { automationId, now = Date.now(), log = console } = {}) {
  const scope = automationId ? `${SCHEDULER_PREFIX}${automationId}:` : SCHEDULER_PREFIX;
  const existing = new Map();
  for (const s of await queue.getJobSchedulers(0, -1, true)) {
    if (s?.key?.startsWith(scope)) existing.set(s.key, s);
  }

  const result = { upserted: [], removed: [], unchanged: [] };
  for (const want of desired.values()) {
    if (!want.id.startsWith(scope)) continue;
    const have = existing.get(want.id);
    const same = have && have.pattern === want.pattern && (have.tz || "") === want.tz;
    const stuck = same && (await isStuck(queue, have, now));
    if (same && !stuck) {
      result.unchanged.push(want.id);
      continue;
    }
    await queue.upsertJobScheduler(
      want.id,
      { pattern: want.pattern, tz: want.tz },
      { name: JOB_NAME, data: { automationId: want.automationId, nodeId: want.nodeId }, opts: JOB_OPTS },
    );
    result.upserted.push(want.id);
    log.log(`[CronScheduler] Scheduled "${want.name}" node ${want.nodeId} → ${want.pattern} (${want.tz})${stuck ? " [was stuck]" : ""}`);
  }

  for (const key of existing.keys()) {
    if (desired.has(key)) continue;
    await queue.removeJobScheduler(key);
    result.removed.push(key);
    log.log(`[CronScheduler] Removed schedule ${key}`);
  }
  return result;
}

/** Drop repeatables left by the old queue.add({ repeat }) scheduler. */
export async function removeLegacyRepeatables(queue, log = console) {
  let removed = 0;
  for (const job of await queue.getRepeatableJobs(0, -1, true)) {
    if (!job?.key || job.key.startsWith(SCHEDULER_PREFIX)) continue;
    await queue.removeRepeatableByKey(job.key);
    removed++;
  }
  if (removed) log.log(`[CronScheduler] Removed ${removed} legacy repeatable job(s)`);
  return removed;
}

/** The slot a scheduler job was produced for, from its "repeat:<schedulerId>:<millis>" id. */
export function slotMillisOf(job) {
  const id = String(job?.id ?? "");
  if (id.startsWith("repeat:")) {
    const tail = Number(id.slice(id.lastIndexOf(":") + 1));
    if (Number.isFinite(tail) && tail > 0) return tail;
  }
  if (Number.isFinite(job?.opts?.prevMillis)) return job.opts.prevMillis;
  return (job?.timestamp || Date.now()) + (job?.opts?.delay || 0);
}

export function createCronProcessor({ loadAutomation, fire, resync = () => {}, now = Date.now, log = console }) {
  return async (job) => {
    const automationId = String(job.data?.automationId ?? "");
    const nodeId = job.data?.nodeId || job.data?.triggerNodeId;
    const slot = slotMillisOf(job);
    const firedAt = now();
    const lateMs = firedAt - slot;

    const automation = automationId ? await loadAutomation(automationId) : null;
    if (!automation || !automation.active) {
      log.log(`[CronScheduler] Automation ${automationId} is inactive or gone, dropping its schedule`);
      resync(automationId);
      return { skipped: "inactive" };
    }

    const node = getTriggerNodesOfType(automation, "cron_trigger").find((n) => n.id === nodeId);
    if (!node) {
      log.log(`[CronScheduler] "${automation.name}" no longer has cron node ${nodeId}, dropping its schedule`);
      resync(automationId);
      return { skipped: "node-gone" };
    }

    const resolved = resolveSchedule(getTriggerConfig(node), automation);
    const firedPattern = job.opts?.repeat?.pattern;
    const firedTz = job.opts?.repeat?.tz;
    const stale = resolved.error
      || (firedPattern && squash(firedPattern) !== resolved.pattern)
      || (firedTz && firedTz !== resolved.tz);
    if (stale) {
      // The save's sync didn't land (Redis blip): this slot belongs to a schedule the user replaced.
      log.warn(`[CronScheduler] "${automation.name}" node ${nodeId} fired on stale schedule ${firedPattern} (${firedTz}); resyncing`);
      resync(automationId);
      return { skipped: "stale" };
    }

    const triggeredAt = new Date(slot).toISOString();
    await fire(
      automation,
      {
        triggeredAt,
        firedAt: new Date(firedAt).toISOString(),
        lateMs,
        schedule: resolved.pattern,
        timezone: resolved.tz,
        triggerType: "cron",
      },
      {
        workspaceId: automation.workspaceId,
        entryNodeId: nodeId,
        idempotencyKey: `cron-${automationId}-${nodeId}-${slot}`,
      },
    );
    log.log(`[CronScheduler] Fired "${automation.name}" node ${nodeId} for ${triggeredAt} (${resolved.tz}), ${lateMs}ms late`);
    return { slot, lateMs };
  };
}

const defaultDeps = {
  listAutomations: (extra) => findAutomationsWithTrigger("cron_trigger", extra),
  loadAutomation: (id) => Automation.findById(id).lean(),
  fire: async (...args) => {
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    return executeAutomation(...args);
  },
};

let deps = defaultDeps;
let cronQueue = null;
let cronWorker = null;
let connections = [];
let healTimer = null;
let chain = Promise.resolve();

function serialised(task) {
  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}

/** Full reconcile of every active cron automation. Startup + periodic heal. */
export function syncCronJobs() {
  return serialised(async () => {
    const queue = cronQueue;
    if (!queue) return null;
    await removeLegacyRepeatables(queue);
    const automations = await deps.listAutomations();
    const result = await reconcileSchedulers(queue, desiredSchedulers(automations));
    console.log(
      `[CronScheduler] Synced ${automations.length} automation(s): ${result.upserted.length} scheduled, ` +
      `${result.removed.length} removed, ${result.unchanged.length} unchanged`,
    );
    return result;
  });
}

/** Reconcile one automation's schedulers after it was saved, toggled or deleted. */
export function syncAutomationCron(automationId) {
  return serialised(async () => {
    const queue = cronQueue;
    if (!queue || !automationId) return null;
    const id = String(automationId);
    const automations = await deps.listAutomations({ _id: id });
    return reconcileSchedulers(queue, desiredSchedulers(automations), { automationId: id });
  });
}

const TIMED_OUT = Symbol("timed out");

async function within(promise, waitMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), waitMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What request handlers call. The Mongo write is already committed and is
 * the source of truth, so a Redis failure is logged rather than failing the
 * request — the next fire's stale check and the periodic heal converge it.
 * The wait is capped because the BullMQ connection queues commands forever
 * while Redis is unreachable.
 */
export async function requestCronSync(automationId, waitMs = SYNC_WAIT_MS) {
  try {
    const outcome = await within(syncAutomationCron(automationId), waitMs);
    if (outcome !== TIMED_OUT) return outcome;
    console.warn(`[CronScheduler] Sync for ${automationId} still pending after ${waitMs}ms; it will finish in the background`);
  } catch (err) {
    console.error(`[CronScheduler] Sync for ${automationId} failed: ${err.message}`);
  }
  return null;
}

export async function startCronScheduler(options = {}) {
  if (cronQueue) return;
  console.log("[CronScheduler] Starting...");

  const { queueName = CRON_QUEUE_NAME, concurrency = WORKER_CONCURRENCY, healIntervalMs = HEAL_INTERVAL_MS, ...overrides } = options;
  deps = { ...defaultDeps, ...overrides };

  const queueConnection = createBullMQConnection();
  const workerConnection = createBullMQConnection();
  connections = [queueConnection, workerConnection];

  cronQueue = new Queue(queueName, { connection: queueConnection, defaultJobOptions: JOB_OPTS });

  const processor = createCronProcessor({
    loadAutomation: (id) => deps.loadAutomation(id),
    fire: (...args) => deps.fire(...args),
    resync: (id) => { syncAutomationCron(id).catch((err) => console.error(`[CronScheduler] Resync of ${id} failed: ${err.message}`)); },
  });
  cronWorker = new Worker(queueName, processor, { connection: workerConnection, concurrency });

  cronWorker.on("failed", (job, err) => {
    console.error(`[CronScheduler] Job failed for automation ${job?.data?.automationId}:`, err.message);
  });
  cronWorker.on("error", (err) => {
    console.error("[CronScheduler] Worker error:", err.message);
  });

  if (healIntervalMs > 0) {
    healTimer = setInterval(() => {
      syncCronJobs().catch((err) => console.error("[CronScheduler] Periodic sync failed:", err.message));
    }, healIntervalMs);
    healTimer.unref?.();
  }

  // Server startup awaits this. Schedulers already in Redis keep firing without a
  // sync, so a Redis or Mongo outage must not hold up or crash boot; the heal retries.
  try {
    if ((await within(syncCronJobs(), SYNC_WAIT_MS)) === TIMED_OUT) {
      console.warn(`[CronScheduler] Initial sync still pending after ${SYNC_WAIT_MS}ms; continuing in the background`);
    }
  } catch (err) {
    console.error("[CronScheduler] Initial sync failed; the periodic sync will retry:", err.message);
  }

  console.log("[CronScheduler] Ready");
}

export async function stopCronScheduler() {
  if (healTimer) clearInterval(healTimer);
  healTimer = null;
  const worker = cronWorker;
  const queue = cronQueue;
  cronWorker = null;
  cronQueue = null;
  await chain;
  if (worker) await worker.close();
  if (queue) await queue.close();
  // Connections handed to BullMQ as instances are "shared", so close() leaves them open.
  await Promise.all(connections.map((c) => c.quit().catch(() => c.disconnect())));
  connections = [];
  deps = defaultDeps;
}

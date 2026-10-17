/**
 * Storage Retention — keeps MongoDB from filling up.
 *
 * Node inputs/outputs (ExecutionData) are only needed while a run is active,
 * for retrying a failed run, and for recent history. After that the run keeps
 * its summary (status, timings, trimmed events) so analytics still count it,
 * and eventually the summary goes too.
 *
 * Pending/running runs and runs with live cursors are never touched.
 */

import mongoose from "mongoose";
import { randomUUID } from "crypto";
import Execution from "../models/execution.model.js";
import ExecutionData from "../models/executionData.model.js";
import ExecutionLog from "../models/executionLog.model.js";
import Automation from "../models/automation.model.js";
import AutomationVersion, { MAX_VERSIONS } from "../models/automationVersion.model.js";
import { acquireLock, renewLock, releaseLock } from "./redis.lock.js";
import { trimAutomationRuns } from "./execution.trim.js";
import {
  EXECUTION_DATA_SUCCESS_HOURS,
  EXECUTION_DATA_FAILED_DAYS,
  EXECUTION_RETENTION_DAYS,
  EXECUTION_MAX_PER_AUTOMATION,
  EXECUTION_LOG_RETENTION_DAYS,
} from "../config/env.js";

const INTERVAL_MS = 30 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 1000;
const LOCK_KEY = "bb:lock:retention";
const LOCK_TTL_SECONDS = 10 * 60;
const BATCH = 500;
const MAX_BATCHES = 20;
const PRUNED_EVENTS_KEPT = 20;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TERMINAL = ["executed", "failed", "partial", "cancelled"];
const LIVE_CURSOR = ["pending", "waiting", "running"];
const finished = { status: { $in: TERMINAL }, "cursors.status": { $nin: LIVE_CURSOR } };

let timer = null;

export function startStorageRetention() {
  console.log(`[Retention] Starting (interval: ${INTERVAL_MS / 60000}m)`);
  timer = setInterval(runRetention, INTERVAL_MS);
  setTimeout(runRetention, FIRST_RUN_DELAY_MS);
}

export function stopStorageRetention() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function pruneExecutionData(filter) {
  let count = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = await Execution.find({ ...filter, dataPrunedAt: null }).select("_id").limit(BATCH).lean();
    if (!batch.length) break;
    const ids = batch.map((e) => e._id);
    // Delete first: an over-quota cluster still accepts deletes but may reject updates
    await ExecutionData.deleteMany({ executionId: { $in: ids } });
    await Execution.updateMany(
      { _id: { $in: ids } },
      {
        $set: { dataPrunedAt: new Date() },
        $unset: { "cursors.$[]._loopItemOverride": "", "cursors.$[]._branchItems": "" },
        $push: { events: { $each: [], $slice: -PRUNED_EVENTS_KEPT } },
      },
      { timestamps: false },
    );
    count += ids.length;
    if (batch.length < BATCH) break;
  }
  return count;
}

async function deleteExecutions(filter) {
  let count = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = await Execution.find(filter).select("_id").limit(BATCH).lean();
    if (!batch.length) break;
    const ids = batch.map((e) => e._id);
    await ExecutionData.deleteMany({ executionId: { $in: ids } });
    await Execution.deleteMany({ _id: { $in: ids } });
    count += ids.length;
    if (batch.length < BATCH) break;
  }
  return count;
}

async function capExecutionsPerAutomation() {
  const heavy = await Execution.aggregate([
    { $group: { _id: "$automationId", n: { $sum: 1 } } },
    { $match: { n: { $gt: EXECUTION_MAX_PER_AUTOMATION } } },
    { $limit: 1000 },
  ]);
  let count = 0;
  for (const { _id: automationId } of heavy) {
    count += await trimAutomationRuns(automationId);
  }
  return count;
}

async function deleteOrphanExecutionData() {
  const orphans = await ExecutionData.aggregate([
    { $group: { _id: "$executionId" } },
    {
      $lookup: {
        from: Execution.collection.name,
        localField: "_id",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1 } }],
        as: "e",
      },
    },
    { $match: { e: { $size: 0 } } },
    { $limit: 5000 },
  ]);
  if (!orphans.length) return 0;
  const { deletedCount } = await ExecutionData.deleteMany({ executionId: { $in: orphans.map((o) => o._id) } });
  return deletedCount;
}

async function trimVersions() {
  let count = 0;
  const over = await AutomationVersion.aggregate([
    { $group: { _id: "$automationId", n: { $sum: 1 } } },
    { $match: { n: { $gt: MAX_VERSIONS } } },
    { $limit: 1000 },
  ]);
  for (const { _id: automationId } of over) {
    const old = await AutomationVersion.find({ automationId })
      .sort({ version: -1 })
      .skip(MAX_VERSIONS)
      .select("_id")
      .lean();
    if (!old.length) continue;
    const { deletedCount } = await AutomationVersion.deleteMany({ _id: { $in: old.map((v) => v._id) } });
    count += deletedCount;
  }

  const orphaned = await AutomationVersion.aggregate([
    { $group: { _id: "$automationId" } },
    {
      $lookup: {
        from: Automation.collection.name,
        localField: "_id",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1 } }],
        as: "a",
      },
    },
    { $match: { a: { $size: 0 } } },
    { $limit: 1000 },
  ]);
  if (orphaned.length) {
    const { deletedCount } = await AutomationVersion.deleteMany({ automationId: { $in: orphaned.map((o) => o._id) } });
    count += deletedCount;
  }
  return count;
}

async function deleteOldPayloadBlobs(cutoff) {
  const { deletedCount } = await mongoose.connection.db
    .collection("payload_blobs")
    .deleteMany({ createdAt: { $lt: cutoff } });
  return deletedCount;
}

export async function runRetention() {
  if (mongoose.connection.readyState !== 1) return;
  const owner = randomUUID();
  let locked = false;
  try {
    locked = await acquireLock(LOCK_KEY, owner, LOCK_TTL_SECONDS);
  } catch (err) {
    console.error("[Retention] Lock unavailable:", err.message);
    return;
  }
  if (!locked) return;

  const now = Date.now();
  const retentionCutoff = new Date(now - EXECUTION_RETENTION_DAYS * DAY);
  const steps = [
    ["successData", () => pruneExecutionData({
      status: "executed",
      "cursors.status": { $nin: LIVE_CURSOR },
      updatedAt: { $lt: new Date(now - EXECUTION_DATA_SUCCESS_HOURS * HOUR) },
    })],
    ["failedData", () => pruneExecutionData({
      status: { $in: ["failed", "partial", "cancelled"] },
      "cursors.status": { $nin: LIVE_CURSOR },
      updatedAt: { $lt: new Date(now - EXECUTION_DATA_FAILED_DAYS * DAY) },
    })],
    // ObjectIds embed their creation time, so this range rides the _id index
    ["oldExecutions", () => deleteExecutions({
      ...finished,
      _id: { $lt: mongoose.Types.ObjectId.createFromTime(Math.floor(retentionCutoff.getTime() / 1000)) },
    })],
    ["perAutomationCap", capExecutionsPerAutomation],
    ["orphanData", deleteOrphanExecutionData],
    ["versions", trimVersions],
    ["executionLogs", async () => (await ExecutionLog.deleteMany({
      timestamp: { $lt: new Date(now - EXECUTION_LOG_RETENTION_DAYS * DAY) },
    })).deletedCount],
    ["payloadBlobs", () => deleteOldPayloadBlobs(retentionCutoff)],
  ];

  const results = {};
  try {
    for (const [name, step] of steps) {
      try {
        const n = await step();
        if (n) results[name] = n;
      } catch (err) {
        console.error(`[Retention] ${name} failed:`, err.message);
      }
      await renewLock(LOCK_KEY, owner, LOCK_TTL_SECONDS).catch(() => {});
    }
    if (Object.keys(results).length) console.log("[Retention] Cleaned:", results);
  } finally {
    await releaseLock(LOCK_KEY, owner).catch(() => {});
  }
}

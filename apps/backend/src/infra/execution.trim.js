/**
 * Per-automation run cap — an automation keeps only its newest
 * EXECUTION_MAX_PER_AUTOMATION runs. Called as soon as a run finishes so a busy
 * automation never piles up history between retention sweeps; the sweep in
 * storage.retention.js is the backstop for anything this misses.
 *
 * Runs still pending/running/waiting are never deleted, however old they are.
 */

import Execution from "../models/execution.model.js";
import ExecutionData from "../models/executionData.model.js";
import { EXECUTION_MAX_PER_AUTOMATION } from "../config/env.js";

const TERMINAL = ["executed", "failed", "partial", "cancelled"];
const LIVE_CURSOR = ["pending", "waiting", "running"];
const finished = { status: { $in: TERMINAL }, "cursors.status": { $nin: LIVE_CURSOR } };
const BATCH = 500;
const MAX_PER_CALL = 5000;

// Several runs of one automation can finish together; one trim covers them all
const inFlight = new Set();

export async function trimAutomationRuns(automationId, keep = EXECUTION_MAX_PER_AUTOMATION) {
  const key = String(automationId);
  if (inFlight.has(key)) return 0;
  inFlight.add(key);
  try {
    const stale = await Execution.find({ automationId })
      .sort({ createdAt: -1 })
      .skip(keep)
      .limit(MAX_PER_CALL)
      .select("_id status cursors.status")
      .lean();
    const ids = stale
      .filter((e) => TERMINAL.includes(e.status) && !e.cursors?.some((c) => LIVE_CURSOR.includes(c.status)))
      .map((e) => e._id);

    let count = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      // Node data first: an interrupted trim leaves a data-less run, never orphaned data
      await ExecutionData.deleteMany({ executionId: { $in: chunk } });
      const { deletedCount } = await Execution.deleteMany({ ...finished, _id: { $in: chunk } });
      count += deletedCount;
    }
    return count;
  } finally {
    inFlight.delete(key);
  }
}

import mongoose from "mongoose";
import Execution from "../../models/execution.model.js";
import Automation from "../../models/automation.model.js";
import ExecutionLog from "../../models/executionLog.model.js";
import { executeAutomation } from "../automation/automation.executor.js";
import { enqueueCursor } from "../workers/cursor.queue.js";

/**
 * GET ANALYTICS — platform-wide daily execution counts + status breakdown.
 * Query params: year (default current), month (1-12, default current).
 * No workspace filter — shows aggregate data for all users.
 */
export async function getAnalytics(req, res) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    const workspaceId = req.user.id;
    const since = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const until = new Date(year, month, 1, 0, 0, 0, 0); // first of next month

    const daysInMonth = new Date(year, month, 0).getDate();

    const [daily, statusBreakdown, totalCount, activeBoxes, monthly] = await Promise.all([
      Execution.aggregate([
        { $match: { workspaceId, createdAt: { $gte: since, $lt: until } } },
        {
          $group: {
            _id: { d: { $dayOfMonth: "$createdAt" } },
            count: { $sum: 1 },
            success: { $sum: { $cond: [{ $in: ["$status", ["executed", "completed"]] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          },
        },
        { $sort: { "_id.d": 1 } },
      ]),
      Execution.aggregate([
        { $match: { workspaceId, createdAt: { $gte: since, $lt: until } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Execution.countDocuments({ workspaceId, createdAt: { $gte: since, $lt: until } }),
      Automation.countDocuments({ workspaceId, status: "active" }),
      Execution.aggregate([
        { $match: { workspaceId, createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
    ]);

    // Fill all days of the month with 0 where no data
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const found = daily.find((r) => r._id.d === d);
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        day: d,
        count: found?.count || 0,
        success: found?.success || 0,
        failed: found?.failed || 0,
      });
    }

    const breakdown = {};
    for (const s of statusBreakdown) breakdown[s._id] = s.count;

    res.json({
      success: true,
      daily: days,
      breakdown,
      total: totalCount,
      activeBoxes,
      monthly,
      meta: { year, month, daysInMonth },
    });
  } catch (err) {
    console.error("[Analytics]", err.message);
    res.status(500).json({ success: false, error: "Failed to load analytics" });
  }
}

/**
 * START EXECUTION
 */
export async function startExecution(req, res) {
  try {
    const { automationId } = req.params;
    const payload = req.body || {};
    const workspaceId = req.user.id;
    const idempotencyKey = req.header("Idempotency-Key") || null;

    const automation = await Automation.findOne({ _id: automationId, workspaceId });
    if (!automation)
      return res
        .status(404)
        .json({ success: false, error: "Automation not found" });

    // IDEMPOTENCY CHECK
    if (idempotencyKey) {
      const existing = await Execution.findOne({
        automationId,
        idempotencyKey,
        workspaceId,
      });
      if (existing)
        return res.json({ success: true, execution: existing, reused: true });
    }

    const execution = await executeAutomation(automation, payload, {
      workspaceId,
      idempotencyKey,
    });
    return res.json({ success: true, execution, reused: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Execution failed" });
  }
}

/**
 * GET EXECUTION BY ID
 */
export async function getExecutionById(req, res) {
  if (!mongoose.isValidObjectId(req.params.executionId))
    return res.status(404).json({ success: false, error: "Not found" });
  const execution = await Execution.findOne({
    _id: req.params.executionId,
    workspaceId: req.user.id,
  });
  if (!execution)
    return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, execution });
}

/**
 * LIST EXECUTIONS
 */
export async function listExecutions(req, res) {
  const { automationId } = req.params;
  const executions = await Execution.find({
    automationId,
    workspaceId: req.user.id,
  })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, executions });
}

/**
 * LIST RECENT EXECUTIONS — across all of the user's workflows, single query.
 * Used by the dashboard Logs tab. Returns up to 50 most recent executions,
 * with automationName joined so the client doesn't need N+1 fetches.
 */
export async function listRecentExecutions(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const executions = await Execution.aggregate([
      { $match: { workspaceId: req.user.id } },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "automations",
          localField: "automationId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "_wf",
        },
      },
      {
        $addFields: {
          automationName: { $ifNull: [{ $arrayElemAt: ["$_wf.name", 0] }, "Deleted workflow"] },
        },
      },
      { $project: { _wf: 0, cursors: 0, events: 0 } },
    ]);
    res.json({ success: true, executions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load executions." });
  }
}

/**
 * 🛑 CANCEL EXECUTION (HARD KILL)
 * Marks all pending/waiting cursors as cancelled so workers drop them.
 */
export async function cancelExecution(req, res) {
  const execution = await Execution.findOne({
    _id: req.params.executionId,
    workspaceId: req.user.id,
  });
  if (!execution) return res.status(404).json({ success: false });

  if (execution.status !== "pending") {
    return res
      .status(400)
      .json({ success: false, message: "Execution is not actively running." });
  }

  // Kill all pending and waiting cursors
  let killedCount = 0;
  execution.cursors.forEach((c) => {
    if (c.status === "pending" || c.status === "waiting") {
      c.status = "failed"; // Workers will ignore it now
      killedCount++;
    }
  });

  execution.status = "failed";
  execution.events.push({
    type: "execution_cancelled",
    message: `User manually cancelled execution. Killed ${killedCount} active cursors.`,
    at: new Date(),
  });

  await execution.save();
  res.json({ success: true, message: "Execution cancelled." });
}

/**
 * ♻️ RETRY FAILED EXECUTION (The n8n Superpower)
 * Finds where the execution crashed, resets the cursor, and pushes it back to Redis.
 */
export async function retryExecution(req, res) {
  const execution = await Execution.findOne({
    _id: req.params.executionId,
    workspaceId: req.user.id,
  });
  if (!execution) return res.status(404).json({ success: false });

  if (execution.status !== "failed") {
    return res.status(400).json({
      success: false,
      message: "Only failed executions can be retried.",
    });
  }

  let retriedCount = 0;

  // Find failed cursors, reset them, and push back to queue
  for (const cursor of execution.cursors) {
    if (cursor.status === "failed") {
      cursor.status = "pending";
      cursor.retries += 1;
      retriedCount++;

      await enqueueCursor({
        executionId: execution._id.toString(),
        cursorId: cursor._id.toString(),
      });
    }
  }

  if (retriedCount > 0) {
    execution.status = "pending";
    execution.events.push({
      type: "execution_retried",
      message: `User initiated retry on ${retriedCount} failed cursors.`,
      at: new Date(),
    });
    await execution.save();
    return res.json({
      success: true,
      message: `Retrying ${retriedCount} nodes.`,
    });
  }

  res
    .status(400)
    .json({ success: false, message: "No failed nodes found to retry." });
}

/**
 * ⏯️ RESUME WAITING EXECUTION (Manual Wakeup)
 */
/**
 * GET EXECUTION LOGS — returns node_step entries for the execution debugger UI
 */
export async function getExecutionLogs(req, res) {
  try {
    const { executionId } = req.params;

    // Resolve the workflowId from the execution (workspace-scoped)
    const execution = await Execution.findOne({
      _id: executionId,
      workspaceId: req.user.id,
    }).lean();

    if (!execution) return res.status(404).json({ success: false, error: "Not found" });

    const logs = await ExecutionLog.find({
      workflowId: execution.workflowId || executionId,
      type: { $in: ["node_step", "execution_start", "execution_end"] },
    })
      .sort({ timestamp: 1 })
      .limit(2000)
      .lean();

    res.json({ success: true, logs });
  } catch (err) {
    console.error("[ExecutionLogs]", err.message);
    res.status(500).json({ success: false, error: "Failed to load logs" });
  }
}

export async function resumeExecution(req, res) {
  const execution = await Execution.findOne({
    _id: req.params.executionId,
    workspaceId: req.user.id,
  });
  if (!execution) return res.status(404).json({ success: false });

  let resumedCount = 0;
  for (const cursor of execution.cursors) {
    if (cursor.status === "waiting") {
      cursor.status = "pending";
      cursor.resumeAt = null;
      resumedCount++;

      await enqueueCursor({
        executionId: execution._id.toString(),
        cursorId: cursor._id.toString(),
      });
    }
  }

  if (resumedCount > 0) {
    execution.events.push({
      type: "execution_resumed",
      message: `User manually woke up ${resumedCount} waiting nodes.`,
      at: new Date(),
    });
    await execution.save();
  }

  res.json({ success: true, resumedCount });
}

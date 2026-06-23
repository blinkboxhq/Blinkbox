import ExecutionLog from "../../models/executionLog.model.js";
import Automation from "../../models/automation.model.js";

/**
 * Workspace-level overview stats for the analytics dashboard.
 * Returns aggregate metrics over the last N days.
 */
export async function workspaceOverview(workspaceId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get automation IDs belonging to this workspace
  const automations = await Automation.find({ workspaceId }).select("_id").lean();
  const automationIds = automations.map((a) => a._id.toString());

  if (automationIds.length === 0) {
    return { totalRuns: 0, successCount: 0, failureCount: 0, avgDurationMs: 0, p95DurationMs: 0, topFailedNodes: [] };
  }

  // Aggregate execution_end records for run counts and success/failure
  const [summary] = await ExecutionLog.aggregate([
    {
      $match: {
        type: "execution_end",
        automationId: { $in: automationIds },
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        successCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        failureCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
      },
    },
  ]);

  // Aggregate node_step records for duration stats (join with execution_start)
  const durationPipeline = await ExecutionLog.aggregate([
    {
      $match: {
        type: "execution_end",
        automationId: { $in: automationIds },
        timestamp: { $gte: since },
        durationMs: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        durations: { $push: "$durationMs" },
        avgDurationMs: { $avg: "$durationMs" },
      },
    },
  ]);

  const durations = (durationPipeline[0]?.durations ?? []).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);
  const p95DurationMs = durations[p95Index] ?? 0;

  // Top 5 most frequently failing nodes across all automations
  const topFailedNodes = await ExecutionLog.aggregate([
    {
      $match: {
        type: "node_step",
        automationId: { $in: automationIds },
        status: "failed",
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: { automationId: "$automationId", nodeId: "$nodeId", nodeType: "$nodeType" },
        failureCount: { $sum: 1 },
      },
    },
    { $sort: { failureCount: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        automationId: "$_id.automationId",
        nodeId: "$_id.nodeId",
        nodeType: "$_id.nodeType",
        failureCount: 1,
      },
    },
  ]);

  return {
    totalRuns: summary?.totalRuns ?? 0,
    successCount: summary?.successCount ?? 0,
    failureCount: summary?.failureCount ?? 0,
    avgDurationMs: Math.round(durationPipeline[0]?.avgDurationMs ?? 0),
    p95DurationMs: Math.round(p95DurationMs),
    topFailedNodes,
  };
}

/**
 * Run history for a specific automation — status + duration per run.
 * Used for sparklines on automation cards.
 */
export async function automationHistory(automationId, limit = 30) {
  const logs = await ExecutionLog.find({
    automationId,
    type: "execution_end",
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return logs.map((l) => ({
    workflowId: l.workflowId,
    status: l.status,
    durationMs: l.durationMs ?? null,
    totalNodes: l.totalNodes ?? null,
    timestamp: l.timestamp,
  }));
}

/**
 * Per-node stats for a specific automation.
 * Useful for identifying bottlenecks and failure-prone nodes.
 */
export async function nodeStats(automationId, limit = 100) {
  const recentWorkflows = await ExecutionLog.distinct("workflowId", {
    automationId,
    type: "execution_end",
  });

  const recentIds = recentWorkflows.slice(-limit);

  const stats = await ExecutionLog.aggregate([
    {
      $match: {
        type: "node_step",
        automationId,
        workflowId: { $in: recentIds },
      },
    },
    {
      $group: {
        _id: { nodeId: "$nodeId", nodeType: "$nodeType" },
        successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        failureCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        avgDurationMs: { $avg: "$durationMs" },
      },
    },
    { $sort: { "_id.nodeId": 1 } },
    {
      $project: {
        _id: 0,
        nodeId: "$_id.nodeId",
        nodeType: "$_id.nodeType",
        successCount: 1,
        failureCount: 1,
        avgDurationMs: { $round: ["$avgDurationMs", 0] },
      },
    },
  ]);

  return stats;
}

/**
 * Daily run counts over the last N days — for bar charts.
 */
export async function dailyRunCounts(workspaceId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const automations = await Automation.find({ workspaceId }).select("_id").lean();
  const automationIds = automations.map((a) => a._id.toString());

  const counts = await ExecutionLog.aggregate([
    {
      $match: {
        type: "execution_end",
        automationId: { $in: automationIds },
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  return counts.map((c) => ({
    date: c._id.date,
    status: c._id.status,
    count: c.count,
  }));
}

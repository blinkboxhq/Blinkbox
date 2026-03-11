import Execution from "../../models/execution.model.js";
import Automation from "../../models/automation.model.js";
import { executeAutomation } from "../automation/automation.executor.js";
import { enqueueCursor } from "../workers/cursor.queue.js"; // Needed for Retries!

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

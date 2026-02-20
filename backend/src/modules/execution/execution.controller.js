import Execution from "../../models/execution.model.js";
import Automation from "../../models/automation.model.js";
import { executeAutomation } from "../automation/automation.executor.js";

/**
 * ===============================
 * START EXECUTION (PHASE 8.10)
 * - Workspace isolated
 * - Idempotent
 * ===============================
 */
export async function startExecution(req, res) {
  try {
    const { automationId } = req.params;
    const payload = req.body || {};

    const workspaceId = req.header("X-Workspace-Id");
    const idempotencyKey = req.header("Idempotency-Key") || null;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "X-Workspace-Id header is required",
      });
    }

    const automation = await Automation.findById(automationId);
    if (!automation) {
      return res.status(404).json({
        success: false,
        error: "Automation not found",
      });
    }

    // 🔒 IDEMPOTENCY CHECK
    if (idempotencyKey) {
      const existing = await Execution.findOne({
        automationId,
        idempotencyKey,
        workspaceId,
      });

      if (existing) {
        return res.json({
          success: true,
          execution: existing,
          reused: true,
        });
      }
    }

    // ✅ CORRECT EXECUTOR CALL
    const execution = await executeAutomation(automation, payload, {
      workspaceId,
      idempotencyKey,
    });

    return res.json({
      success: true,
      execution,
      reused: false,
    });
  } catch (err) {
    console.error("START EXECUTION ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * ===============================
 * GET EXECUTION BY ID
 * ===============================
 */
export async function getExecutionById(req, res) {
  const execution = await Execution.findById(req.params.executionId);
  if (!execution) {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  res.json({ success: true, execution });
}

/**
 * ===============================
 * LIST EXECUTIONS
 * ===============================
 */
export async function listExecutions(req, res) {
  const { automationId } = req.params;
  const executions = await Execution.find({ automationId })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, executions });
}

/**
 * ===============================
 * RESUME EXECUTION
 * ===============================
 */
export async function resumeExecution(req, res) {
  const execution = await Execution.findById(req.params.executionId);
  if (!execution) {
    return res.status(404).json({ success: false });
  }

  execution.cursors.forEach((c) => {
    if (c.status === "waiting") {
      c.status = "pending";
      c.resumeAt = null;
    }
  });

  await execution.save();

  res.json({ success: true });
}

/**
 * ===============================
 * CANCEL EXECUTION
 * ===============================
 */
export async function cancelExecution(req, res) {
  const execution = await Execution.findById(req.params.executionId);
  if (!execution) {
    return res.status(404).json({ success: false });
  }

  execution.status = "failed";
  execution.error = "Cancelled by user";
  await execution.save();

  res.json({ success: true });
}

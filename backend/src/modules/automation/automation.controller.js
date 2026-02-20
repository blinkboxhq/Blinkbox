import Automation from "../../models/automation.model.js";
import Execution from "../../models/execution.model.js";
import { executeAutomation } from "./automation.executor.js";

/**
 * POST /automations/:id/execute
 */
export async function triggerAutomation(req, res) {
  const { id } = req.params;
  const payload = req.body || {};

  const automation = await Automation.findById(id);
  if (!automation) {
    return res.status(404).json({ error: "Automation not found" });
  }

  const execution = await executeAutomation(automation, payload);

  res.json({
    success: true,
    executionId: execution._id,
    status: execution.status,
  });
}

/**
 * POST /executions/:id/resume
 */
export async function resumeExecution(req, res) {
  const { id } = req.params;

  const execution = await Execution.findById(id);
  if (!execution) {
    return res.status(404).json({ error: "Execution not found" });
  }

  const automation = await Automation.findById(execution.automationId);
  if (!automation) {
    return res.status(404).json({ error: "Automation missing" });
  }

  const resumed = await executeAutomation(
    automation,
    execution.context,
    execution._id,
  );

  res.json({
    success: true,
    executionId: resumed._id,
    status: resumed.status,
  });
}

/**
 * GET /executions/:id
 */
export async function getExecution(req, res) {
  const execution = await Execution.findById(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: "Execution not found" });
  }

  res.json(execution);
}

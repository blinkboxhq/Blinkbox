/**
 * Error Trigger Dispatcher
 *
 * When any automation execution fails at a node, call dispatchErrorTriggers().
 * It finds all active "error_trigger" automations in the same workspace and
 * fires them with the failure context as the trigger payload.
 *
 * Two watch modes (set in the trigger node's config):
 *   - watchAll: true  → fires for any failed workflow in the workspace
 *   - watchAll: false → fires only if the failed automationId matches config.watchedAutomation
 */

import Automation from "../models/automation.model.js";

export async function dispatchErrorTriggers({
  workspaceId,
  automationId,
  automationName,
  executionId,
  nodeId,
  nodeType,
  errorMessage,
  failedAt = new Date().toISOString(),
}) {
  // Find active error_trigger automations in this workspace (cap at 20 to prevent cascade DoS)
  const errorAutomations = await Automation.find({
    workspaceId,
    trigger: "error_trigger",
    active: true,
  }).limit(20);

  if (!errorAutomations.length) return;

  // Dynamic import to avoid circular deps (same pattern as cron.scheduler.js)
  const { executeAutomation } = await import(
    "../modules/automation/automation.executor.js"
  );

  const triggerPayload = {
    error: {
      message: errorMessage,
      nodeId,
      nodeType,
      automationId: String(automationId),
      automationName,
      executionId: String(executionId),
      failedAt,
    },
  };

  for (const errAuto of errorAutomations) {
    const entryNode = errAuto.nodes.find((n) => n.id === errAuto.entryNodeId);
    const cfg = entryNode?.data?.config || {};

    // If watching a specific automation, filter
    if (!cfg.watchAll && cfg.watchedAutomation) {
      if (String(automationId) !== cfg.watchedAutomation) continue;
    }

    try {
      await executeAutomation(errAuto, triggerPayload, {
        workspaceId,
        idempotencyKey: `error:${errAuto._id}:${executionId}:${failedAt}`,
      });
      console.log(
        `[ErrorTrigger] Fired error handler "${errAuto.name}" for failed automation "${automationName}"`,
      );
    } catch (err) {
      // Never let error handler dispatch crash the caller
      console.error(
        `[ErrorTrigger] Failed to fire error handler "${errAuto.name}":`,
        err.message,
      );
    }
  }
}

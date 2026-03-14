/**
 * Execution Service — Starts automation runs via Temporal workflows.
 *
 * Replaces the old BullMQ-based flow:
 *   OLD: executeAutomation() → Execution.create() → enqueueCursor() → BullMQ
 *   NEW: startWorkflowExecution() → Temporal Client → executeAutomationWorkflow
 *
 * The Temporal workflow handles DAG traversal, retries, timeouts, and
 * crash recovery — all previously managed by cursor.executor + resumer.
 */

import crypto from "crypto";
import { getTemporalClient, TASK_QUEUE } from "../../temporal/client.js";

/**
 * Start a Temporal workflow for the given automation.
 *
 * @param {object} automation - Mongoose Automation document
 * @param {object|array} payload - Trigger data (webhook body, cron context, etc.)
 * @param {object} options
 * @param {string} options.workspaceId - Owning workspace
 * @param {string} [options.idempotencyKey] - Dedup key (auto-generated if missing)
 * @returns {{ workflowId: string, runId: string }}
 */
export async function startWorkflowExecution(automation, payload = {}, options = {}) {
  const {
    workspaceId = "default",
    idempotencyKey = crypto.randomUUID(),
  } = options;

  const client = await getTemporalClient();

  // Normalize trigger payload (same logic as the old executor)
  const triggerData = Array.isArray(payload)
    ? { items: payload.map((item) => (item.json ? item : { json: item })) }
    : payload;

  // Build the WorkflowDefinition from the Mongoose document
  const definition = {
    name: automation.name,
    trigger: automation.trigger,
    active: automation.active,
    workspaceId,
    nodes: automation.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data ?? n.config ?? {},
      position: n.position ?? { x: 0, y: 0 },
      description: n.description ?? "",
    })),
    edges: automation.edges.map((e) => ({
      id: e.id ?? `${e.source ?? e.from}-${e.target ?? e.to}`,
      source: e.source ?? e.from,
      target: e.target ?? e.to,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      condition: e.condition ?? "always",
      type: e.type ?? "onSuccess",
      description: e.description ?? "",
    })),
    entryNodeId: automation.entryNodeId,
    settings: automation.settings ?? { maxParallel: 10 },
    description: automation.description ?? "",
  };

  // Temporal workflowId doubles as idempotency key — same ID = same execution
  const workflowId = `automation-${automation._id}-${idempotencyKey}`;

  const handle = await client.workflow.start("executeAutomationWorkflow", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [automation._id.toString(), definition, triggerData],
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

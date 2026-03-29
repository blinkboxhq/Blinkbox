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
import { validateAutomation } from "../automation/engine/automation.validator.js";

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
    edges: automation.edges.map((e) => {
      // Visual editors store connection state in sourceHandle (e.g. 'success',
      // 'error', 'true', 'false') or use UI-specific type names like 'default'.
      // Temporal's DAG routing expects strict "onSuccess" / "onFailure" keywords.
      const isErrorPath =
        e.sourceHandle === "error" ||
        e.sourceHandle === "false" ||
        e.type === "onFailure";

      return {
        id: e.id ?? `${e.source ?? e.from}-${e.target ?? e.to}`,
        source: e.source ?? e.from,
        target: e.target ?? e.to,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        condition: e.condition ?? "always",
        type: isErrorPath ? "onFailure" : "onSuccess",
        description: e.description ?? "",
      };
    }),
    entryNodeId: automation.entryNodeId,
    settings: automation.settings ?? { maxParallel: 10 },
    description: automation.description ?? "",
  };

  // Validate DAG before scheduling — rejects cycles, orphan edges, unreachable nodes
  validateAutomation({
    nodes: definition.nodes,
    edges: definition.edges,
    entryNodeId: definition.entryNodeId,
  });

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

/**
 * Start a Temporal workflow and AWAIT its completion (synchronous bridge).
 *
 * Used by the webhook controller when ?wait=true — the HTTP connection stays
 * open until the workflow finishes and returns its full output (including any
 * __webhookResponse from a respond_webhook node).
 *
 * @param {object} automation - Mongoose Automation document
 * @param {object|array} payload - Trigger data
 * @param {object} options
 * @param {string} options.workspaceId
 * @param {string} [options.idempotencyKey]
 * @returns {Promise<Record<string, unknown>>} Full workflow output
 */
export async function startAndAwaitWorkflowExecution(automation, payload = {}, options = {}) {
  const {
    workspaceId = "default",
    idempotencyKey = crypto.randomUUID(),
  } = options;

  const client = await getTemporalClient();

  const triggerData = Array.isArray(payload)
    ? { items: payload.map((item) => (item.json ? item : { json: item })) }
    : payload;

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
    edges: automation.edges.map((e) => {
      const isErrorPath =
        e.sourceHandle === "error" ||
        e.sourceHandle === "false" ||
        e.type === "onFailure";

      return {
        id: e.id ?? `${e.source ?? e.from}-${e.target ?? e.to}`,
        source: e.source ?? e.from,
        target: e.target ?? e.to,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        condition: e.condition ?? "always",
        type: isErrorPath ? "onFailure" : "onSuccess",
        description: e.description ?? "",
      };
    }),
    entryNodeId: automation.entryNodeId,
    settings: automation.settings ?? { maxParallel: 10 },
    description: automation.description ?? "",
  };

  validateAutomation({
    nodes: definition.nodes,
    edges: definition.edges,
    entryNodeId: definition.entryNodeId,
  });

  const workflowId = `automation-${automation._id}-${idempotencyKey}`;

  // execute() starts the workflow AND awaits its completion, returning the result.
  const result = await client.workflow.execute("executeAutomationWorkflow", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [automation._id.toString(), definition, triggerData],
  });

  return result;
}

/**
 * Execution Service — starts automation runs.
 *
 * Primary path: Temporal (approval signals, long-running workflows, DAG traversal).
 * Fallback path: BullMQ cursor engine (when Temporal is unavailable or TEMPORAL_ADDRESS unset).
 *
 * Both paths are fully production-capable. Temporal is optional infrastructure.
 */

import crypto from "crypto";
import { validateAutomation } from "../automation/engine/automation.validator.js";
import { executeAutomation } from "../automation/automation.executor.js";

// The Temporal activities have no checkCredits/deductCredits calls, so routing
// production runs through Temporal would bypass billing entirely — force the
// BullMQ engine in production until the Temporal path reaches credit parity.
const TEMPORAL_CONFIGURED = !!process.env.TEMPORAL_ADDRESS;
const USE_TEMPORAL = TEMPORAL_CONFIGURED && process.env.NODE_ENV !== "production";
if (TEMPORAL_CONFIGURED && !USE_TEMPORAL) {
  console.error(
    "[ExecutionService] TEMPORAL_ADDRESS is set but the Temporal path skips credit metering — ignoring it in production, all runs use the BullMQ engine.",
  );
}

async function getTemporalClient() {
  const { getTemporalClient: _get } = await import("../../temporal/client.js");
  return _get();
}

function buildDefinition(automation, workspaceId) {
  return {
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
        e.sourceHandle === "error" || e.sourceHandle === "false" || e.type === "onFailure";
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
}

function normalizeTriggerData(payload) {
  return Array.isArray(payload)
    ? { items: payload.map((item) => (item.json ? item : { json: item })) }
    : payload;
}

export async function startWorkflowExecution(automation, payload = {}, options = {}) {
  const { workspaceId = "default", idempotencyKey = crypto.randomUUID(), entryNodeId } = options;
  const triggerData = normalizeTriggerData(payload);
  const definition = buildDefinition(automation, workspaceId);
  if (entryNodeId) definition.entryNodeId = entryNodeId;

  validateAutomation({
    nodes: definition.nodes,
    edges: definition.edges,
    entryNodeId: definition.entryNodeId,
  });

  if (USE_TEMPORAL) {
    try {
      const client = await getTemporalClient();
      const workflowId = `automation-${automation._id}-${idempotencyKey}`;
      const { TASK_QUEUE } = await import("../../temporal/client.js");
      const handle = await client.workflow.start("executeAutomationWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId,
        args: [automation._id.toString(), definition, triggerData],
      });
      return { workflowId: handle.workflowId, runId: handle.firstExecutionRunId };
    } catch (err) {
      console.warn(`[ExecutionService] Temporal unavailable (${err.message}), falling back to BullMQ`);
    }
  }

  const execution = await executeAutomation(automation, triggerData, {
    workspaceId,
    ...(entryNodeId ? { entryNodeId } : {}),
  });
  return { executionId: execution._id?.toString() };
}

export async function startAndAwaitWorkflowExecution(automation, payload = {}, options = {}) {
  const { workspaceId = "default", idempotencyKey = crypto.randomUUID(), entryNodeId } = options;
  const triggerData = normalizeTriggerData(payload);
  const definition = buildDefinition(automation, workspaceId);
  if (entryNodeId) definition.entryNodeId = entryNodeId;

  validateAutomation({
    nodes: definition.nodes,
    edges: definition.edges,
    entryNodeId: definition.entryNodeId,
  });

  if (USE_TEMPORAL) {
    try {
      const client = await getTemporalClient();
      const workflowId = `automation-${automation._id}-${idempotencyKey}`;
      const { TASK_QUEUE } = await import("../../temporal/client.js");
      return await client.workflow.execute("executeAutomationWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId,
        args: [automation._id.toString(), definition, triggerData],
      });
    } catch (err) {
      console.warn(`[ExecutionService] Temporal unavailable (${err.message}), falling back to BullMQ (fire-and-forget)`);
    }
  }

  await executeAutomation(automation, triggerData, {
    workspaceId,
    ...(entryNodeId ? { entryNodeId } : {}),
  });
  return {};
}

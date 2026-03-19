/**
 * Temporal Workflow — Deterministic DAG traversal for automation execution.
 *
 * DETERMINISM RULES (enforced by Temporal's V8 sandbox):
 *   - No Date.now(), Math.random(), or direct I/O
 *   - All side effects go through proxyActivities
 *   - Use Temporal's sleep() instead of setTimeout
 *   - Condition evaluation is pure logic (inlined below)
 */

import { proxyActivities, sleep } from "@temporalio/workflow";
import type { WorkflowDefinition } from "../schemas.js";
import type * as activities from "./activities.js";

// ── Activity Proxies ────────────────────────────────────────────────────────────

const acts = proxyActivities<typeof activities>({
  startToCloseTimeout: "60s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "30s",
  },
});

// Telemetry: best-effort, non-fatal. Short timeout, single attempt.
// If Redis is down, the workflow still completes — logs are just lost.
const tel = proxyActivities<Pick<typeof activities, "emitTelemetryActivity">>({
  startToCloseTimeout: "5s",
  retry: { maximumAttempts: 1 },
});

// Vault: store/resolve heavy payloads in MongoDB (keeps Temporal history lean)
const vault = proxyActivities<
  Pick<
    typeof activities,
    "storePayloadActivity" | "resolvePayloadActivity" | "cleanupPayloadsActivity"
  >
>({
  startToCloseTimeout: "15s",
  retry: { maximumAttempts: 2, initialInterval: "500ms" },
});

// ── Constants ───────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = new Set(["manual", "webhook", "cron_trigger"]);
const MAX_ITERATIONS = 500;

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Fire-and-forget telemetry — never throws, never blocks the critical path. */
async function emitTelemetry(
  ...args: Parameters<typeof tel.emitTelemetryActivity>
): Promise<void> {
  try {
    await tel.emitTelemetryActivity(...args);
  } catch {
    // Telemetry failure is non-fatal — swallow silently
  }
}

// ── Workflow Entry Point ────────────────────────────────────────────────────────

export async function executeAutomationWorkflow(
  automationId: string,
  definition: WorkflowDefinition,
  triggerData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Build lookup structures from the definition (deterministic, no I/O)
  const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));
  const nodeOutputs: Record<string, unknown> = {};
  const processed = new Set<string>();
  const queue: string[] = [definition.entryNodeId];

  // Seed the entry node with trigger data
  nodeOutputs[definition.entryNodeId] = triggerData;

  // ── Telemetry: execution started ────────────────────────────────────────
  await emitTelemetry({
    action: "execution_start",
    workflowId: automationId,
    automationId,
    trigger: definition.trigger,
    triggerData,
  });

  let iterations = 0;
  let anyFailed = false;

  while (queue.length > 0) {
    if (++iterations > MAX_ITERATIONS) {
      throw new Error(
        `Execution exceeded ${MAX_ITERATIONS} iteration limit (cycle guard)`,
      );
    }

    const nodeId = queue.shift()!;
    if (processed.has(nodeId)) continue;

    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found in workflow definition`);
    }

    // ── Collect input from parent nodes ───────────────────────────────────
    const incomingEdges = definition.edges.filter((e) => e.target === nodeId);
    let input: Record<string, unknown>;

    if (incomingEdges.length === 0) {
      // Entry / trigger node — use seeded data
      input =
        (nodeOutputs[nodeId] as Record<string, unknown>) ?? triggerData;
    } else {
      // Merge parent outputs into a single input object
      input = {};
      for (const edge of incomingEdges) {
        let parentOutput = nodeOutputs[edge.source];
        // Resolve vault references on-demand
        if (isPayloadRef(parentOutput)) {
          const resolved = await vault.resolvePayloadActivity({
            ref: (parentOutput as { _payloadRef: string })._payloadRef,
          });
          parentOutput = resolved.data;
        }
        if (
          parentOutput &&
          typeof parentOutput === "object" &&
          !Array.isArray(parentOutput)
        ) {
          Object.assign(input, parentOutput as Record<string, unknown>);
        } else if (parentOutput !== undefined) {
          input[edge.source] = parentOutput;
        }
      }
    }

    // ── Execute the node ──────────────────────────────────────────────────
    let output: unknown;
    let failed = false;
    let errorMsg: string | undefined;
    const stepStart = Date.now();

    try {
      if (TRIGGER_TYPES.has(node.type)) {
        // Trigger nodes are pass-through — data already seeded
        output = input;
      } else if (node.type === "delay") {
        // Use Temporal's deterministic sleep instead of setTimeout
        const delayMs = (node.data["ms"] as number) ?? 60_000;
        await sleep(delayMs);
        output = input;
      } else if (node.type === "http_request") {
        // Dedicated activity with full Vault credential support
        output = await acts.executeHttpRequestActivity({
          url: (node.data["url"] as string) ?? "",
          method: node.data["method"] as string | undefined,
          headers: node.data["headers"] as Record<string, string> | undefined,
          body: node.data["body"],
          credentialId: node.data["credentialId"] as string | undefined,
          workspaceId: definition.workspaceId,
          queryParams: node.data["queryParams"] as
            | Record<string, string>
            | undefined,
          timeout: node.data["timeout"] as number | undefined,
          followRedirects: node.data["followRedirects"] as boolean | undefined,
        });
      } else if (node.type === "code") {
        // Hard-isolated V8 sandbox — 32MB memory, 500ms timeout
        const codeResult = await acts.executeSecureCodeActivity({
          code: (node.data["code"] as string) ?? "",
          variables: input,
        });
        output = codeResult.result;
      } else {
        // All other node types — dispatch via the generic activity
        output = await acts.executeNodeActivity({
          nodeType: node.type,
          config: node.data as Record<string, unknown>,
          inputData: input,
          workspaceId: definition.workspaceId,
        });
      }
    } catch (err) {
      failed = true;
      anyFailed = true;
      errorMsg = (err as Error).message;
      output = { error: errorMsg };
    }

    const durationMs = Date.now() - stepStart;

    // Vault: offload large outputs to MongoDB, keep only a pointer in state
    const stored = await vault.storePayloadActivity({
      workflowId: automationId,
      nodeId,
      data: output,
    });
    nodeOutputs[nodeId] = stored.ref
      ? { _payloadRef: stored.ref }
      : output;
    processed.add(nodeId);

    // ── Telemetry: node step ─────────────────────────────────────────────
    await emitTelemetry({
      action: "node_step",
      workflowId: automationId,
      automationId,
      nodeId,
      nodeType: node.type,
      status: failed ? "failed" : "success",
      durationMs,
      input,
      output,
      error: errorMsg,
    });

    // ── Route to downstream nodes via edges ───────────────────────────────
    const edgeType = failed ? "onFailure" : "onSuccess";
    const outgoing = definition.edges.filter(
      (e) => e.source === nodeId && e.type === edgeType,
    );

    for (const edge of outgoing) {
      const evalContext =
        typeof output === "object" && output !== null
          ? (output as Record<string, unknown>)
          : {};

      if (!evaluateCondition(edge.condition, evalContext)) continue;

      const target = edge.target;
      if (processed.has(target)) continue;

      // Merge gate: all incoming sources for this target must be processed
      const allIncoming = definition.edges.filter((e) => e.target === target);
      const ready = allIncoming.every(
        (e) => e.source === nodeId || processed.has(e.source),
      );

      if (ready) queue.push(target);
    }
  }

  // ── Telemetry: execution ended ──────────────────────────────────────────
  await emitTelemetry({
    action: "execution_end",
    workflowId: automationId,
    automationId,
    status: anyFailed ? "failed" : "completed",
    totalNodes: processed.size,
  });

  // ── Cleanup vault blobs for this workflow ────────────────────────────
  try {
    await vault.cleanupPayloadsActivity({ workflowId: automationId });
  } catch {
    // Non-fatal — orphaned blobs are acceptable
  }

  return nodeOutputs;
}

// ── Vault Ref Check (pure logic — no I/O) ─────────────────────────────────────

function isPayloadRef(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "_payloadRef" in (value as Record<string, unknown>)
  );
}

// ── Condition Evaluator (pure logic — safe for deterministic workflows) ────────

function evaluateCondition(
  condition: string | Record<string, unknown> | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!condition || condition === "always" || condition === "true") return true;
  if (condition === "false") return false;
  // Empty objects from the DB (no operator/left/right) should pass through
  if (typeof condition === "object" && Object.keys(condition).length === 0)
    return true;
  if (condition["type"] === "always") return true;

  const { operator, left, right } = condition as {
    operator?: string;
    left?: unknown;
    right?: unknown;
  };

  const resolve = (value: unknown): unknown => {
    if (typeof value === "string" && value.startsWith("{{")) {
      const path = value.replace(/[{}\s]/g, "").split(".");
      return path.reduce<unknown>(
        (obj, key) =>
          obj && typeof obj === "object"
            ? (obj as Record<string, unknown>)[key]
            : undefined,
        context,
      );
    }
    return value;
  };

  const l = resolve(left);
  const r = resolve(right);

  switch (operator) {
    case "equals":
      return l == r;
    case "strictEquals":
      return l === r;
    case "not_equals":
    case "notEquals":
      return l != r;
    case "greater_than":
    case "gt":
      return Number(l) > Number(r);
    case "less_than":
    case "lt":
      return Number(l) < Number(r);
    case "gte":
      return Number(l) >= Number(r);
    case "lte":
      return Number(l) <= Number(r);
    case "contains":
      return String(l).includes(String(r));
    case "notContains":
      return !String(l).includes(String(r));
    case "startsWith":
      return String(l).startsWith(String(r));
    case "endsWith":
      return String(l).endsWith(String(r));
    case "exists":
      return l !== undefined && l !== null;
    case "isEmpty":
      return (
        l === undefined ||
        l === null ||
        l === "" ||
        (Array.isArray(l) && l.length === 0)
      );
    case "isNotEmpty":
      return (
        l !== undefined &&
        l !== null &&
        l !== "" &&
        !(Array.isArray(l) && l.length === 0)
      );
    default:
      return false;
  }
}

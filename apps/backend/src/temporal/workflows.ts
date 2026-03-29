/**
 * Temporal Workflow — Deterministic DAG traversal for automation execution.
 *
 * DETERMINISM RULES (enforced by Temporal's V8 sandbox):
 *   - No Date.now(), Math.random(), or direct I/O
 *   - All side effects go through proxyActivities
 *   - Use Temporal's sleep() instead of setTimeout
 *   - Condition evaluation is pure logic (inlined below)
 *
 * AI AGENT ARCHITECTURE:
 *   The aiAgent node is dispatched as a Child Workflow (not a single activity).
 *   This prevents thread-blocking: each ReAct micro-step (Think, Act, Observe)
 *   is a separate activity, allowing the Temporal worker thread to yield during
 *   long LLM/API waits. The parent workflow awaits the child's result like any
 *   other node output.
 */

import {
  proxyActivities,
  executeChild,
  sleep,
  defineSignal,
  setHandler,
  condition,
} from "@temporalio/workflow";
import type { WorkflowDefinition } from "../schemas.js";
import type * as activities from "./activities.js";

// Re-export the AI Agent Child Workflow so Temporal's bundler registers it.
// The parent workflow dispatches it via executeChild("executeAiAgentWorkflow", ...).
export { executeAiAgentWorkflow } from "./aiAgentWorkflow.js";

// ── Approval Signal ─────────────────────────────────────────────────────────────
// External systems (email links, Slack buttons, API calls) fire this signal
// to wake a sleeping approval node. The payload identifies which node to
// unblock and whether the human approved or rejected.

export interface ApprovalSignalPayload {
  nodeId: string;
  status: "approved" | "rejected";
  reviewerEmail?: string;
  comment?: string;
}

export const approvalSignal = defineSignal<[ApprovalSignalPayload]>("approvalSignal");

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

// Approval notification: send email/Slack with approve/reject links
const notify = proxyActivities<
  Pick<typeof activities, "sendApprovalNotificationActivity">
>({
  startToCloseTimeout: "30s",
  retry: { maximumAttempts: 3, initialInterval: "1s", backoffCoefficient: 2 },
});

// ── Constants ───────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = new Set(["manual", "webhook", "cron_trigger"]);
const MAX_ITERATIONS = 500;

// Approval nodes can sleep for up to 30 days waiting for human input.
// After that, the workflow times out — configurable per-node via data.timeoutMs.
const DEFAULT_APPROVAL_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

  // ── Approval Signal State ──────────────────────────────────────────────
  // Map of nodeId → approval decision. When a signal arrives, it writes here.
  // The approval node's condition() check reads from here to unblock.
  const approvalDecisions: Record<string, ApprovalSignalPayload> = {};

  setHandler(approvalSignal, (payload: ApprovalSignalPayload) => {
    // Store the decision keyed by nodeId so the correct approval node wakes up.
    // Multiple approval nodes in the same DAG each wait on their own nodeId.
    approvalDecisions[payload.nodeId] = payload;
  });

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
      } else if (node.type === "approval") {
        // ── The Governor: Human-in-the-Loop Approval ───────────────
        // 1. Fire a notification activity (email/Slack) with approve/reject links
        // 2. Sleep indefinitely until the approvalSignal arrives for this nodeId
        // 3. Route output down onSuccess (approved) or onFailure (rejected)

        await notify.sendApprovalNotificationActivity({
          workflowId: automationId,
          nodeId,
          nodeLabel: (node.data["label"] as string) ?? "Approval Required",
          notifyChannels: (node.data["notifyChannels"] as string[]) ?? ["email"],
          notifyTo: (node.data["notifyTo"] as string) ?? "",
          smtpCredentialId: (node.data["smtpCredentialId"] as string) ?? "",
          slackCredentialId: (node.data["slackCredentialId"] as string) ?? "",
          slackChannel: (node.data["slackChannel"] as string) ?? "",
          contextSummary: JSON.stringify(input).slice(0, 2000),
          workspaceId: definition.workspaceId ?? "",
        });

        // Telemetry: node is now waiting for human input
        await emitTelemetry({
          action: "node_step",
          workflowId: automationId,
          automationId,
          nodeId,
          nodeType: "approval",
          status: "waiting",
          durationMs: 0,
          input,
        });

        // Block until signal arrives or timeout expires.
        // condition() returns true when the predicate is satisfied.
        // If timeout fires first, condition() returns false.
        const timeoutMs =
          (node.data["timeoutMs"] as number) ?? DEFAULT_APPROVAL_TIMEOUT_MS;

        const signalReceived = await condition(
          () => approvalDecisions[nodeId] !== undefined,
          timeoutMs,
        );

        if (!signalReceived) {
          // Timeout — treat as rejection
          output = {
            approved: false,
            status: "timeout",
            nodeId,
            message: `Approval timed out after ${Math.round(timeoutMs / 3600000)}h with no response.`,
          };
          failed = true;
          anyFailed = true;
          errorMsg = (output as { message: string }).message;
        } else {
          const decision = approvalDecisions[nodeId];
          const isApproved = decision.status === "approved";

          output = {
            approved: isApproved,
            status: decision.status,
            reviewerEmail: decision.reviewerEmail ?? null,
            comment: decision.comment ?? null,
            nodeId,
            decidedAt: Date.now(),
          };

          if (!isApproved) {
            failed = true;
            anyFailed = true;
            errorMsg = `Approval rejected${decision.comment ? `: ${decision.comment}` : ""}`;
          }
        }
      } else if (node.type === "aiAgent") {
        // ── AI Agent: Child Workflow (not a blocking activity) ──────
        // The ReAct loop is decomposed into micro-activities inside
        // the child workflow so the Temporal worker thread yields
        // during long LLM/API waits instead of blocking.
        output = await executeChild("executeAiAgentWorkflow", {
          args: [
            {
              nodeConfig: node.data as Record<string, unknown>,
              inputData: input,
              workspaceId: definition.workspaceId ?? "",
              parentWorkflowId: automationId,
              nodeId,
            },
          ],
          workflowId: `${automationId}-aiAgent-${nodeId}`,
          // Child inherits the parent's task queue
          taskQueue: undefined,
          // Total budget: 15 iterations * 2min each + overhead
          workflowExecutionTimeout: "35m",
        });
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

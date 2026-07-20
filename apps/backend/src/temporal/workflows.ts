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
import { evaluateConditionV2 } from "./condition.inline.js";

// Re-export the AI Agent Child Workflow so Temporal's bundler registers it.
// The parent workflow dispatches it via executeChild("executeAiAgentWorkflow", ...).
export { executeAiAgentWorkflow } from "./aiAgentWorkflow.js";

// ── Webhook Event Signal ────────────────────────────────────────────────────────
// A wait_for_event node parks until its public webhook URL is called. The
// signal carries the request that woke it.

export interface WebhookEventPayload {
  nodeId: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export const webhookEventSignal =
  defineSignal<[WebhookEventPayload]>("webhookEventSignal");

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

// Live canvas: push per-node status to Socket.IO for real-time edge animation.
// Same fire-and-forget semantics as telemetry — never blocks the critical path.
const live = proxyActivities<
  Pick<typeof activities, "emitNodeStatusActivity">
>({
  startToCloseTimeout: "3s",
  retry: { maximumAttempts: 1 },
});

// Vault: store/resolve heavy payloads in Redis (keeps Temporal history lean)
const vault = proxyActivities<
  Pick<
    typeof activities,
    | "storePayloadActivity"
    | "resolvePayloadActivity"
    | "cleanupPayloadsActivity"
    | "flushPayloadsActivity"
    | "cleanupWorkflowBinariesActivity"
  >
>({
  startToCloseTimeout: "15s",
  retry: { maximumAttempts: 2, initialInterval: "500ms" },
});

// Sub-Workflow: load the target automation definition from MongoDB
const subWf = proxyActivities<
  Pick<typeof activities, "loadSubWorkflowDefinitionActivity">
>({
  startToCloseTimeout: "15s",
  retry: { maximumAttempts: 2, initialInterval: "500ms" },
});

// ── Constants ───────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = new Set([
  "manual", "webhook", "cron_trigger",
  "imap_trigger", "rss_trigger", "db_trigger",
  "telegram_trigger", "slack_trigger", "discord_trigger", "whatsapp_trigger",
  "gmail_trigger", "airtable_trigger", "notion_trigger", "hubspot_trigger",
  "shopify_trigger", "stripe_trigger", "github_trigger", "linear_trigger",
  "typeform_trigger",
]);
const MAX_ITERATIONS = 500;

// ── Per-Node Activity Proxy ─────────────────────────────────────────────────────

interface NodeRetryPolicy {
  maxAttempts?: number;
  initialIntervalMs?: number;
  backoffCoefficient?: number;
  maxIntervalMs?: number;
  retryOnFailure?: boolean;
}

/**
 * Build a fresh proxyActivities using the node's retryPolicy + timeoutMs.
 * proxyActivities() is synchronous (returns a JS Proxy, no network call),
 * so creating one per node execution adds negligible overhead.
 */
function getActivitiesForNode(node: { data: Record<string, unknown> }) {
  const policy = (node.data["retryPolicy"] as NodeRetryPolicy | undefined) ?? {};
  const timeoutMs = Math.min(
    Math.max((node.data["timeoutMs"] as number | undefined) ?? 60_000, 1_000),
    3_600_000,
  );
  return proxyActivities<typeof activities>({
    startToCloseTimeout: `${timeoutMs}ms`,
    retry: {
      maximumAttempts: policy.maxAttempts ?? 3,
      initialInterval: `${policy.initialIntervalMs ?? 1_000}ms`,
      backoffCoefficient: policy.backoffCoefficient ?? 2,
      maximumInterval: `${policy.maxIntervalMs ?? 30_000}ms`,
    },
  });
}

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

/** Fire-and-forget live canvas status — pushes node lifecycle to Socket.IO. */
async function emitLiveStatus(
  ...args: Parameters<typeof live.emitNodeStatusActivity>
): Promise<void> {
  try {
    await live.emitNodeStatusActivity(...args);
  } catch {
    // Socket failure is non-fatal — canvas just won't animate this node
  }
}

// ── Workflow Entry Point ────────────────────────────────────────────────────────

export async function executeAutomationWorkflow(
  automationId: string,
  definition: WorkflowDefinition,
  triggerData: Record<string, unknown>,
  parentChain: string[] = [],
): Promise<Record<string, unknown>> {
  // Build lookup structures from the definition (deterministic, no I/O)
  const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));
  const nodeOutputs: Record<string, unknown> = {};
  const processed = new Set<string>();
  const inflight = new Set<string>(); // prevents double-dispatch at merge points

  // Pre-compute adjacency maps for O(1) lookups during traversal
  const incomingEdgesMap = new Map<string, typeof definition.edges>();
  const outgoingEdgesMap = new Map<string, typeof definition.edges>();
  for (const edge of definition.edges) {
    const inc = incomingEdgesMap.get(edge.target) ?? [];
    inc.push(edge);
    incomingEdgesMap.set(edge.target, inc);

    const out = outgoingEdgesMap.get(edge.source) ?? [];
    out.push(edge);
    outgoingEdgesMap.set(edge.source, out);
  }

  // Seed the entry node with trigger data
  nodeOutputs[definition.entryNodeId] = triggerData;

  // ── Webhook Event State ────────────────────────────────────────────────
  const webhookEvents: Record<string, WebhookEventPayload> = {};

  setHandler(webhookEventSignal, (payload: WebhookEventPayload) => {
    webhookEvents[payload.nodeId] = payload;
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

  // ── Inner Functions ──────────────────────────────────────────────────────

  /** Gather and merge outputs from all parent nodes, resolving vault refs. */
  async function collectInput(
    nodeId: string,
  ): Promise<Record<string, unknown>> {
    const incomingEdges = incomingEdgesMap.get(nodeId) ?? [];

    if (incomingEdges.length === 0) {
      return (
        (nodeOutputs[nodeId] as Record<string, unknown>) ?? triggerData
      );
    }

    const input: Record<string, unknown> = {};
    for (const edge of incomingEdges) {
      let parentOutput = nodeOutputs[edge.source];
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
    return input;
  }

  /** Dispatch a single node by type and return its result. */
  async function executeNode(
    node: (typeof definition.nodes)[number],
    nodeId: string,
    input: Record<string, unknown>,
  ): Promise<{ output: unknown; failed: boolean; errorMsg?: string }> {
    let output: unknown;
    let failed = false;
    let errorMsg: string | undefined;

    try {
      if (TRIGGER_TYPES.has(node.type)) {
        output = input;
      } else if (node.type === "delay") {
        const delayMs = (node.data["ms"] as number) ?? 60_000;
        await sleep(delayMs);
        output = input;
      } else if (node.type === "http_request") {
        const nodeActs = getActivitiesForNode(node);
        output = await nodeActs.executeHttpRequestActivity({
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
          responseType: (node.data["responseType"] as "auto" | "json" | "binary") ?? "auto",
          workflowId: automationId,
          nodeId,
        });
      } else if (node.type === "code") {
        const nodeActs = getActivitiesForNode(node);
        const codeResult = await nodeActs.executeSecureCodeActivity({
          code: (node.data["code"] as string) ?? "",
          variables: input,
        });
        output = codeResult.result;
      } else if (node.type === "wait_for_event") {
        await emitTelemetry({
          action: "node_step",
          workflowId: automationId,
          automationId,
          nodeId,
          nodeType: "wait_for_event",
          status: "waiting",
          durationMs: 0,
          input,
        });

        // No timeout by design — the branch parks until the webhook fires.
        await condition(() => webhookEvents[nodeId] !== undefined);

        const event = webhookEvents[nodeId];
        output = {
          ...(input as Record<string, unknown>),
          body: event.body ?? {},
          headers: event.headers ?? {},
          query: event.query ?? {},
          receivedAt: new Date().toISOString(),
        };
      } else if (node.type === "sub_workflow") {
        const targetAutomationId = (node.data["targetAutomationId"] as string) ?? "";
        if (!targetAutomationId) {
          throw new Error(
            `Sub-Workflow node "${nodeId}": Missing targetAutomationId in config.`,
          );
        }

        const childChain = [...parentChain, automationId];
        const childDef = await subWf.loadSubWorkflowDefinitionActivity({
          targetAutomationId,
          workspaceId: definition.workspaceId ?? "",
          parentChain: childChain,
        });

        const explicitPayload = (node.data["payload"] as Record<string, unknown>) ?? {};
        const childTriggerData = {
          ...input,
          ...explicitPayload,
          __parentContext: {
            triggeredBy: "sub_workflow",
            parentWorkflowId: automationId,
            parentNodeId: nodeId,
          },
        };

        const childResult = await executeChild("executeAutomationWorkflow", {
          args: [
            childDef.automationId,
            {
              name: childDef.name,
              trigger: childDef.trigger,
              active: childDef.active,
              workspaceId: childDef.workspaceId,
              nodes: childDef.nodes,
              edges: childDef.edges,
              entryNodeId: childDef.entryNodeId,
              settings: childDef.settings,
              description: childDef.description,
            },
            childTriggerData,
            childChain,
          ],
          workflowId: `sub-${automationId}-${nodeId}-${Date.now()}`,
          taskQueue: undefined,
          workflowExecutionTimeout: "60m",
        });

        output = childResult;
      } else if (node.type === "aiAgent") {
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
          taskQueue: undefined,
          workflowExecutionTimeout: "35m",
        });
      } else {
        const retryOnFailure = (node.data["retryPolicy"] as NodeRetryPolicy | undefined)?.retryOnFailure ?? true;
        if (!retryOnFailure) {
          // Error boundary: catch immediately, route to onFailure edges — no Temporal-level retries
          try {
            const nodeActs = getActivitiesForNode({ data: { ...node.data, retryPolicy: { ...(node.data["retryPolicy"] as object ?? {}), maxAttempts: 1 } } });
            output = await nodeActs.executeNodeActivity({
              nodeType: node.type,
              config: node.data as Record<string, unknown>,
              inputData: input,
              workspaceId: definition.workspaceId,
            });
          } catch (err) {
            failed = true;
            errorMsg = (err as Error).message;
            output = { error: errorMsg };
          }
        } else {
          const nodeActs = getActivitiesForNode(node);
          output = await nodeActs.executeNodeActivity({
            nodeType: node.type,
            config: node.data as Record<string, unknown>,
            inputData: input,
            workspaceId: definition.workspaceId,
          });
        }
      }
    } catch (err) {
      failed = true;
      errorMsg = (err as Error).message;
      output = { error: errorMsg };
    }

    if (failed) anyFailed = true;
    return { output, failed, errorMsg };
  }

  /**
   * Recursive DAG traversal with parallel fan-out.
   * When a node has multiple outgoing onSuccess edges, all ready downstream
   * targets are dispatched concurrently via Promise.all. Merge nodes act as
   * natural wait-all barriers — they only become "ready" when every incoming
   * source has been processed.
   */
  async function processNode(nodeId: string): Promise<void> {
    // Guard: already processed or currently being processed by another branch
    if (processed.has(nodeId) || inflight.has(nodeId)) return;
    inflight.add(nodeId);

    if (++iterations > MAX_ITERATIONS) {
      throw new Error(
        `Execution exceeded ${MAX_ITERATIONS} iteration limit (cycle guard)`,
      );
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found in workflow definition`);
    }

    // Collect merged input from all parent nodes
    const input = await collectInput(nodeId);

    // Live canvas: mark node as running
    await emitLiveStatus({
      automationId,
      nodeId,
      nodeType: node.type,
      status: "started",
    });

    // Execute the node
    const stepStart = Date.now();
    const { output, failed, errorMsg } = await executeNode(node, nodeId, input);
    const durationMs = Date.now() - stepStart;

    // Live canvas: mark node as completed or failed
    await emitLiveStatus({
      automationId,
      nodeId,
      nodeType: node.type,
      status: failed ? "failed" : "completed",
      durationMs,
      error: errorMsg,
    });

    // Vault: offload large outputs, keep only a pointer in state
    const stored = await vault.storePayloadActivity({
      workflowId: automationId,
      nodeId,
      data: output,
    });
    nodeOutputs[nodeId] = stored.ref
      ? { _payloadRef: stored.ref }
      : output;
    processed.add(nodeId);

    // Telemetry: node step (Redis queue for batch flush — separate from live socket)
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

    // ── Route to downstream nodes ──────────────────────────────────────
    const edgeType = failed ? "onFailure" : "onSuccess";
    const outgoing = (outgoingEdgesMap.get(nodeId) ?? []).filter(
      (e) => e.type === edgeType,
    );

    const readyTargets: string[] = [];
    for (const edge of outgoing) {
      const evalContext =
        typeof output === "object" && output !== null
          ? (output as Record<string, unknown>)
          : {};

      if (!evaluateConditionV2(edge.condition as Parameters<typeof evaluateConditionV2>[0], evalContext)) continue;

      const target = edge.target;
      if (processed.has(target) || inflight.has(target)) continue;

      // Merge gate: all incoming sources for this target must be processed
      const allIncoming = incomingEdgesMap.get(target) ?? [];
      const ready = allIncoming.every(
        (e) => e.source === nodeId || processed.has(e.source),
      );

      if (ready) readyTargets.push(target);
    }

    // Fan-out: execute ready downstream nodes in parallel
    if (readyTargets.length === 1) {
      await processNode(readyTargets[0]);
    } else if (readyTargets.length > 1) {
      await Promise.all(readyTargets.map((t) => processNode(t)));
    }
  }

  // ── Start DAG traversal from the entry node ──────────────────────────────
  await processNode(definition.entryNodeId);

  // ── Telemetry: execution ended ──────────────────────────────────────────
  await emitTelemetry({
    action: "execution_end",
    workflowId: automationId,
    automationId,
    status: anyFailed ? "failed" : "completed",
    totalNodes: processed.size,
  });

  // ── Extract respond_webhook output for synchronous callers ──────────
  // If the DAG contains a respond_webhook node, its __webhookResponse
  // payload becomes the top-level return so the webhook controller can
  // send it back to the waiting HTTP client.
  let webhookResponse: unknown = undefined;
  for (const nId of processed) {
    const n = nodeMap.get(nId);
    if (n?.type !== "respond_webhook") continue;
    let out = nodeOutputs[nId];
    if (isPayloadRef(out)) {
      const resolved = await vault.resolvePayloadActivity({
        ref: (out as { _payloadRef: string })._payloadRef,
      });
      out = resolved.data;
    }
    if (out && typeof out === "object" && "__webhookResponse" in (out as Record<string, unknown>)) {
      webhookResponse = (out as Record<string, unknown>).__webhookResponse;
      break; // First respond_webhook wins
    }
  }

  // ── Flush vault payloads: Redis → MongoDB for long-term logging ──────
  // This eagerly persists payloads to MongoDB so they survive Redis TTL
  // expiry. The background flusher is a safety net for workflows that
  // crash before reaching this point.
  try {
    await vault.flushPayloadsActivity({ workflowId: automationId });
  } catch {
    // Non-fatal — background flusher will catch it within 60s
  }

  // ── Cleanup binary files for completed workflows ───────────────────
  // Binary files in S3/local disk are ephemeral — they should be cleaned
  // up after the workflow completes. Downstream consumers (webhook responses,
  // UI previews) must retrieve binaries before the workflow finishes.
  // TODO: Make cleanup opt-in via workflow settings if retention is needed.
  // For now, binaries persist until explicit cleanup or TTL-based expiry.

  // Include __webhookResponse at the top level so callers using
  // client.workflow.execute() can extract the custom HTTP response.
  if (webhookResponse !== undefined) {
    (nodeOutputs as Record<string, unknown>).__webhookResponse = webhookResponse;
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

// evaluateCondition replaced by evaluateConditionV2 from condition.inline.ts

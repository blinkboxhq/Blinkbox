import Execution from "../../models/execution.model.js";
import ExecutionData from "../../models/executionData.model.js";
import Automation from "../../models/automation.model.js";
import { performance } from "perf_hooks";
import { nodeRegistry } from "../../nodes/index.js";
import { enqueueCursor } from "./cursor.queue.js";
import { evaluateCondition } from "../../modules/automation/engine/condition.evaluator.js";
import { emitExecutionEvent } from "../execution/execution.events.js";
import { resolveConfig } from "../../modules/automation/engine/expression.parser.js";

import { acquireLock, releaseLock, renewLock } from "../../infra/redis.lock.js";
import { emitExecutionUpdate, emitNodeStatus } from "../../infra/socket.server.js";
import { RedisKeys } from "../../infra/redis.keys.js";
import { scheduleDelay } from "../../infra/delay.scheduler.js";
import { checkCredits, deductCredits } from "../../infra/credit.gateway.js";
import toolRegistry from "../../nodes/agentTools.registry.js";
import { describeMemoryNode } from "../../nodes/agentMemory.js";
import { toPlatformTool } from "../../nodes/integrationManifest.js";

const NODE_TIMEOUT_MS = 60 * 1000;
// Must stay well under the resumer's STALE_MS (90s) or long-running nodes get re-enqueued mid-flight
const HEARTBEAT_MS = 15 * 1000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_ATTEMPTS = 10;
const RETRY_MAX_DELAY_MS = 5 * 60 * 1000;
const MAX_CURSORS_PER_EXECUTION = 500;

// A data-flow edge feeds the standard input array (vs. agent slots: llm/memory/tools).
// The merge node exposes numbered handles (input, input-1, input-2, …) so each parallel
// branch lands on its own port; all of them still count as data flow.
const isDataFlowHandle = (h) => !h || h === "input" || h.startsWith("input-");

// Merge has a single "input" dot, so branches normally fill in edge order. The
// "input-N" ids come from workflows saved while merge briefly had per-branch
// dots; honouring them keeps those wirings pointing at the same branch.
const mergeSlotOf = (handle) => {
  if (!handle || handle === "input") return 0;
  const n = Number(handle.slice("input-".length));
  return Number.isInteger(n) && n >= 0 ? n : null;
};

function collectMergeBranches(dataFlowEdges, dynamicContext, config) {
  const slots = [];
  const unslotted = [];

  for (const edge of dataFlowEdges) {
    const sourceData = dynamicContext[edge.source];
    const items = Array.isArray(sourceData) ? sourceData.map((d) => d.json) : [];
    const value = items.length === 1 ? items[0] : items.length ? items : null;
    const slot = edge.targetHandle ? mergeSlotOf(edge.targetHandle) : null;
    if (slot == null || slots[slot] !== undefined) unslotted.push(value);
    else slots[slot] = value;
  }

  for (const value of unslotted) {
    let i = 0;
    while (slots[i] !== undefined) i++;
    slots[i] = value;
  }

  const declared = Array.isArray(config?.branches) ? config.branches.length : 0;
  const length = Math.max(slots.length, declared);
  return Array.from({ length }, (_, i) => (slots[i] === undefined ? null : slots[i]));
}

/**
 * Classify an error and generate a human-readable fix hint.
 */
function classifyError(err, nodeType, config) {
  const msg = err.message || String(err);
  const lower = msg.toLowerCase();

  // Timeout errors
  if (lower.includes("timeout") || lower.includes("exceeded") || lower.includes("etimedout")) {
    return {
      category: "timeout",
      message: msg,
      hint: nodeType === "web_scraper"
        ? "The page took too long to load. Try a simpler URL or increase the timeout in node config."
        : nodeType === "http_request"
        ? `The API at "${config?.url || "unknown"}" did not respond in time. Check the URL is correct and the server is reachable.`
        : "This node took too long. Try simplifying the operation or breaking it into smaller steps.",
    };
  }

  // Network errors
  if (lower.includes("enotfound") || lower.includes("econnrefused") || lower.includes("econnreset") || lower.includes("fetch failed")) {
    const url = config?.url || "unknown";
    return {
      category: "network",
      message: msg,
      hint: `Cannot reach "${url}". Check: (1) URL is correct, (2) server is running, (3) no firewall blocking the request.`,
    };
  }

  // Auth/credential errors
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("invalid bot token")) {
    return {
      category: "auth",
      message: msg,
      hint: "Authentication failed. Check your credentials in the encrypted vault — API key may be expired or incorrect.",
    };
  }

  // Bad request / config errors — permanent, no retry
  if (lower.includes("bad request") || lower.includes("chat not found") || lower.includes("invalid chat") || lower.includes("user not found") || lower.includes("400")) {
    return {
      category: "config",
      message: msg,
      hint: "The request was rejected due to invalid configuration (e.g. wrong chat ID, missing field). Fix the node config and re-run.",
    };
  }

  // Rate limiting
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many")) {
    return {
      category: "rate_limit",
      message: msg,
      hint: "You've hit a rate limit on the external API. The system will auto-retry with backoff. If it persists, add a Delay node before this one.",
    };
  }

  // JSON parse errors
  if (lower.includes("json") && (lower.includes("parse") || lower.includes("unexpected"))) {
    return {
      category: "parse",
      message: msg,
      hint: "The response wasn't valid JSON. If this is an API call, check the URL returns JSON, not HTML. If it's test data, fix the JSON syntax.",
    };
  }

  // Expression/template errors
  if (lower.includes("expression") || lower.includes("{{") || lower.includes("undefined is not")) {
    return {
      category: "expression",
      message: msg,
      hint: "A {{ expression }} in this node's config couldn't resolve. Check that the referenced field exists in the upstream node's output.",
    };
  }

  // Code sandbox errors
  if (nodeType === "code" && (lower.includes("syntaxerror") || lower.includes("referenceerror") || lower.includes("typeerror"))) {
    return {
      category: "code",
      message: msg,
      hint: "Your code has a JavaScript error. Check the Code node for syntax issues, undefined variables, or type mismatches.",
    };
  }

  // Memory/resource errors
  if (lower.includes("memory") || lower.includes("heap") || lower.includes("allocation")) {
    return {
      category: "resource",
      message: msg,
      hint: "This node used too much memory. Try processing smaller data batches or simplifying the operation.",
    };
  }

  // Generic fallback
  return {
    category: "unknown",
    message: msg,
    hint: "Check the node configuration and upstream data. If the issue persists, try removing and re-adding the node.",
  };
}

/**
 * Core cursor processor with atomic locking, retry logic, and crash recovery.
 */
export async function processCursor({ executionId, cursorId }) {
  const startTime = performance.now();
  const cellId = process.pid;

  // ATOMIC LOCK: Only claim cursor if it's still "pending"
  const lockResult = await Execution.updateOne(
    { _id: executionId },
    {
      $set: {
        status: "running",
        "cursors.$[c].status": "running",
        "cursors.$[c].lockedAt": new Date(),
        "cursors.$[c].lockedBy": `cell-${cellId}`,
      },
    },
    {
      arrayFilters: [{ "c._id": cursorId, "c.status": { $in: ["pending", "waiting"] } }],
    },
  );

  // Another worker already claimed it — bail
  if (lockResult.modifiedCount === 0) return;

  const execution = await Execution.findById(executionId);
  if (!execution) return;

  const cursor = execution.cursors.id(cursorId);
  if (!cursor) return;

  // Check for cancelled cursor
  if (cursor.status !== "running") return;

  const automation = await Automation.findById(execution.automationId);
  if (!automation) {
    await _markCursorFailed(execution, cursor, "Automation blueprint not found. It may have been deleted.", "config");
    return;
  }

  const node = automation.nodes.find((n) => n.id === cursor.nodeId);
  if (!node) {
    await _markCursorFailed(execution, cursor, `Node [${cursor.nodeId}] not found in blueprint. Save your workflow and try again.`, "config");
    return;
  }

  const handler = nodeRegistry[node.type];
  if (!handler) {
    await _markCursorFailed(
      execution, cursor,
      `Node type "${node.type}" is not supported. Remove this node and replace it with a supported one.`,
      "config",
    );
    return;
  }

  // CREDIT GATE: Check quota before executing this node
  const creditCheck = await checkCredits(execution.workspaceId, node.type);
  if (!creditCheck.allowed) {
    // Self-hosted instances meter over the network, so "cannot bill" is a
    // distinct failure from "out of credits" and needs its own wording.
    const blocked =
      creditCheck.reason === "invalid_license"
        ? "Self-hosted license key is invalid or revoked. Check SELF_HOST_LICENSE_KEY."
        : creditCheck.reason === "metering_unavailable"
          ? "Cannot reach Blinkbox cloud to meter this node. Execution paused until connectivity returns."
          : `Credit quota exceeded: ${creditCheck.remaining} remaining, need ${creditCheck.cost}. Upgrade your plan to continue.`;

    await emitExecutionEvent(execution._id, {
      type: "quota_exceeded",
      nodeId: node.id,
      message: creditCheck.reason
        ? blocked
        : `Credit limit reached (${creditCheck.creditsUsed}/${creditCheck.monthlyLimit}). Node "${node.type}" costs ${creditCheck.cost} credits.`,
      meta: { plan: creditCheck.plan, remaining: creditCheck.remaining, cost: creditCheck.cost, reason: creditCheck.reason },
    });
    await _markCursorFailed(execution, cursor, blocked, "quota");
    return;
  }

  let finalOutputs = [];
  let nodeDelayUntil = null;
  const conditionTrueItems = [];
  const conditionFalseItems = [];
  let executionError = null;
  let errorClassification = null;
  let dynamicContext = {};
  let resolvedInput = null;

  // Heartbeat keeps lockedAt fresh so the resumer never re-enqueues a live long-running node
  const nodeHeartbeat = setInterval(() => {
    Execution.updateOne(
      { _id: executionId },
      { $set: { "cursors.$[c].lockedAt": new Date() } },
      { arrayFilters: [{ "c._id": cursorId, "c.status": "running" }] },
    ).catch(() => {});
  }, HEARTBEAT_MS);

  try {
    await emitExecutionEvent(execution._id, {
      type: "node_started",
      nodeId: node.id,
      message: `Executing ${node.type} node "${node.data?.label || node.id}"`,
    });

    // Emit live node:status so Canvas animates in real time (manual + scheduled runs)
    emitNodeStatus(execution.automationId?.toString() || execution.workflowId?.toString(), {
      automationId: execution.automationId?.toString() || execution.workflowId?.toString(),
      nodeId: node.id,
      status: "started",
      executionId: execution._id?.toString(),
    });

    // VAULT RECONSTRUCTION: Retrieve all historical data for this execution
    const allPastData = await ExecutionData.find({ executionId: execution._id });
    allPastData.forEach((doc) => {
      dynamicContext[doc.nodeId] = doc.output;
      // Also index by human-readable slug so {{chat_trigger.output}} expressions work
      const srcNode = automation.nodes.find(n => n.id === doc.nodeId);
      if (srcNode) {
        const slug = (srcNode.data?.config?.customLabel || srcNode.data?.label || srcNode.type || "node")
          .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        if (slug && slug !== doc.nodeId) dynamicContext[slug] = doc.output;
      }
    });

    // Identify inputs (auto-grab from parents or self-trigger).
    // Agent slot edges (llm, memory, tools) are excluded — they feed handleDeps,
    // not the data-flow input array.
    const incomingEdges = automation.edges.filter((e) => e.target === node.id);
    const dataFlowEdges = incomingEdges.filter((e) => isDataFlowHandle(e.targetHandle));
    let inputItems = [];

    // LOOP FAN-OUT: cursor carries a specific item snapshot — use it exclusively
    if (cursor._loopItemOverride != null) {
      inputItems = [{ json: cursor._loopItemOverride }];
    } else if (Array.isArray(cursor._branchItems)) {
      // Condition split: only the items that took this branch, not the node's
      // whole output batch.
      inputItems = cursor._branchItems.map((json) => ({ json }));
    } else if (dataFlowEdges.length === 0) {
      inputItems = dynamicContext[node.id] || [{ json: {} }];
    } else {
      for (const edge of dataFlowEdges) {
        const sourceData = dynamicContext[edge.source];
        if (Array.isArray(sourceData)) inputItems.push(...sourceData);
      }
    }

    if (inputItems.length === 0) inputItems = [{ json: {} }];

    // HANDLE-AWARE ROUTING: For AI Agent nodes, separate handle-tagged
    // edge data into dedicated dependency fields (_memory, _tools, _chatModel).
    // Edges targeting named handles feed into config, not the standard input array.
    let handleDeps = null;
    if (node.type === "ai_agent" && incomingEdges.length > 0) {
      handleDeps = {};
      for (const edge of incomingEdges) {
        const handle = edge.targetHandle;
        if (handle && handle !== "input") {
          const sourceData = dynamicContext[edge.source];
          const firstOutput = Array.isArray(sourceData) ? sourceData[0]?.json : null;
          if (handle === "memory") {
            // Memory sub-nodes never execute, so there is no output to read —
            // hand the agent the provider's config and let it drive the store.
            const memNode = automation.nodes.find((n) => n.id === edge.source);
            handleDeps._memory = describeMemoryNode(memNode) || firstOutput;
          } else if (handle === "tools") {
            // Tools handle: build callable tool definitions with execute closures.
            // If the source node exports a toolDefinition, wrap it with an execute()
            // closure that calls the node's run() on demand during the agent's ReAct loop.
            // Otherwise, fall back to passing the node's static output.
            if (!handleDeps._tools) handleDeps._tools = [];
            const sourceNode = automation.nodes.find((n) => n.id === edge.source);
            if (sourceNode) {
              const toolType = sourceNode.type;
              if (toolType === "agent_tool" && sourceNode.data?.toolId) {
                const savedData = sourceNode.data || {};
                const resolved = toolRegistry.resolve(savedData.toolId, { workspaceId: execution.workspaceId });
                if (resolved) {
                  const credId = savedData.credentialId;
                  handleDeps._tools.push({
                    name: savedData.toolName
                      ? savedData.toolName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "")
                      : resolved.name,
                    description: savedData.toolDesc || resolved.description,
                    parameters: resolved.parameters,
                    execute: (args) => resolved.execute(credId ? { credentialId: credId, ...args } : args),
                  });
                }
              } else {
                const toolHandler = nodeRegistry[toolType];
                if (toolHandler?.toolDefinition) {
                  const toolDef = { ...toolHandler.toolDefinition };
                  const savedConfig = sourceNode.data || {};
                  // Config and args must stay separate: merging let the model's
                  // args overwrite a pinned url/workflowId/allowlist, which is
                  // the exact thing pinning them was supposed to prevent.
                  toolDef.execute = async (agentArgs) => {
                    return toolHandler.run(savedConfig, agentArgs, {
                      workspaceId: execution.workspaceId,
                      executionId: execution._id?.toString(),
                    });
                  };
                  handleDeps._tools.push(toolDef);
                } else if (firstOutput) {
                  handleDeps._tools.push(firstOutput);
                }
              }
            }
          } else if (handle === "chat_model" || handle === "llm") {
            const sourceNode = automation.nodes.find((n) => n.id === edge.source);
            handleDeps._chatModel = sourceNode
              ? { ...(sourceNode.data || {}), backendType: sourceNode.type }
              : firstOutput;
          } else if (handle === "integration") {
            const sourceNode = automation.nodes.find((n) => n.id === edge.source);
            const pt = toPlatformTool(sourceNode);
            if (pt) {
              if (!handleDeps._platformTools) handleDeps._platformTools = [];
              handleDeps._platformTools.push(pt);
            }
          } else if (handle === "skills") {
            const sourceNode = automation.nodes.find((n) => n.id === edge.source);
            const skillCfg = sourceNode?.data?.config || sourceNode?.data;
            if (skillCfg?.content || skillCfg?.name) {
              if (!handleDeps._skills) handleDeps._skills = [];
              handleDeps._skills.push({
                name: skillCfg.name || sourceNode?.data?.label || "Skill",
                description: skillCfg.description || "",
                content: skillCfg.fileType === "zip" ? "" : (skillCfg.content || ""),
                fileName: skillCfg.fileName || "",
              });
            }
          }
        }
      }
    }

    // Store what went into this node for diagnostics
    resolvedInput = inputItems[0]?.json || {};

    // KERNEL EXECUTION: Run node with timeout guard (handler.timeoutMs overrides; 0 = unlimited, heartbeat keeps the cursor alive)
    const nodeTimeoutMs = handler.timeoutMs !== undefined ? handler.timeoutMs : NODE_TIMEOUT_MS;

    // MERGE: needs every branch at once, not one item per run. One incoming
    // edge is one branch — a parent emitting many items must not spread across
    // slots and shift every branch after it.
    if (node.type === "merge") {
      let resolvedConfig;
      try {
        resolvedConfig = resolveConfig(node.data, inputItems[0]?.json || {}, dynamicContext, 0);
      } catch (configErr) {
        throw new Error(`Config resolution failed: ${configErr.message}. Check {{ expressions }} in this node's settings.`);
      }
      const branches = collectMergeBranches(dataFlowEdges, dynamicContext, resolvedConfig);
      const rawOutput = await withTimeout(
        handler.run(resolvedConfig, branches, { workspaceId: execution.workspaceId, toolRegistry, triggerOutput: dynamicContext[automation.entryNodeId]?.[0]?.json }),
        nodeTimeoutMs,
      );
      if (outputIsSkipped(rawOutput)) {
        finalOutputs.__skipped = true;
        finalOutputs.__skipReason = rawOutput.error;
      }
      finalOutputs.push(...(Array.isArray(rawOutput) ? rawOutput.map((r) => (r.json ? r : { json: r })) : [{ json: rawOutput }]));
    } else
    for (let i = 0; i < inputItems.length; i++) {
      const item = inputItems[i];

      let resolvedConfig;
      try {
        resolvedConfig = resolveConfig(node.data, item.json, dynamicContext, i);
      } catch (configErr) {
        throw new Error(`Config resolution failed: ${configErr.message}. Check {{ expressions }} in this node's settings.`);
      }

      // Inject handle-routed dependencies into config for AI Agent
      if (handleDeps) {
        Object.assign(resolvedConfig, handleDeps);
      }

      let rawOutput = await withTimeout(
        handler.run(resolvedConfig, item.json, { workspaceId: execution.workspaceId, automationId: automation._id, executionId, nodeId: node.id, toolRegistry, triggerOutput: dynamicContext[automation.entryNodeId]?.[0]?.json }),
        nodeTimeoutMs,
      );

      // Trigger filter signal — null means "ignore this event, stop execution silently"
      if (rawOutput === null && node.id === automation.entryNodeId) {
        return; // abort without error; webhook already returned 200
      }

      // Handle custom Delay/Sleep requests from nodes. Everything the node
      // passed through survives the sleep — replacing the payload outright made
      // every upstream field unreachable downstream of a Delay.
      if (rawOutput && rawOutput.__delay) {
        nodeDelayUntil = new Date(rawOutput.resumeAfter);
        const { __delay, resumeAfter, ...passthrough } = rawOutput;
        rawOutput = { ...passthrough, delayed: true, requestedSleep: true };
      }

      // Wait for webhook: park every downstream branch with no deadline at all.
      // The public wait endpoint is the only thing that releases them.
      if (rawOutput && rawOutput.__waitWebhook === true) {
        const { __waitWebhook, ...passthrough } = rawOutput;
        rawOutput = passthrough;
        finalOutputs.__waitWebhook = true;
      }

      // Loop fan-out: store items array so routeEdges can spawn one cursor per item
      if (rawOutput && rawOutput.__loopFanOut === true) {
        finalOutputs.__loopFanOut = true;
        finalOutputs.__loopItems = rawOutput.items || [];
        // Still store the full array as the saved output for {{ loop.* }} references
        finalOutputs.push(...(rawOutput.items.length ? rawOutput.items : [{ json: {} }]));
        break; // loop node only runs once per trigger item
      }

      // Condition branch signal — stripped here so it never travels downstream.
      // Left in the payload, any passthrough node on the branch re-emits it and
      // the executor reads it as that node's own false verdict, routing to
      // failure edges it does not have and killing the rest of the branch.
      let conditionBranch = null;
      if (rawOutput && typeof rawOutput.__conditionResult === "boolean") {
        const { __conditionResult, ...passthrough } = rawOutput;
        conditionBranch = __conditionResult;
        rawOutput = passthrough;
      }

      // Aggregate is still filling its batch. This cursor completes without
      // routing; whichever run receives the last item routes for all of them.
      if (rawOutput && rawOutput.__hold === true) {
        finalOutputs.__hold = true;
        rawOutput = { pending: true, collected: rawOutput.collected, expected: rawOutput.expected };
      }

      // Rate limiter's "drop" strategy: end this branch quietly. Without this
      // the drop still routed downstream, so dropping and passing through were
      // the same thing.
      if (rawOutput && rawOutput.__stopBranch === true) {
        finalOutputs.__stopBranch = true;
      }

      // A node that refused to run (missing config, no credential) reports it in
      // the payload rather than throwing. Record the first reason and keep going
      // so the item's own output is still stored for diagnostics.
      if (outputIsSkipped(rawOutput) && !finalOutputs.__skipped) {
        finalOutputs.__skipped = true;
        finalOutputs.__skipReason = rawOutput.error;
      }

      const formatted = Array.isArray(rawOutput)
        ? rawOutput.map((r) => (r.json ? r : { json: r }))
        : [{ json: rawOutput }];

      finalOutputs.push(...formatted);

      if (conditionBranch !== null) {
        (conditionBranch ? conditionTrueItems : conditionFalseItems).push(...formatted);
      }
    }
  } catch (err) {
    errorClassification = classifyError(err, node.type, node.data);
    executionError = errorClassification.message;
  } finally {
    clearInterval(nodeHeartbeat);
  }

  // ATOMIC MERGE GATE: Prevent parallel race conditions via Redis
  const lockKey = RedisKeys.executionLock(executionId);
  const lockOwner = cursorId;
  let locked = false;
  let attempts = 0;

  while (!locked && attempts < 50) {
    locked = await acquireLock(lockKey, lockOwner, 30);
    if (!locked) {
      attempts++;
      await new Promise((res) => setTimeout(res, 200));
    }
  }

  if (!locked) {
    console.warn(`[Congestion] Execution ${executionId} busy. Re-queuing...`);
    await enqueueCursor({ executionId, cursorId });
    return;
  }

  // Slow merges (large fan-outs, cold Mongo) can outlive the 30s TTL and let
  // a second cursor enter the gate — keep the lock alive until release.
  const lockHeartbeat = setInterval(() => {
    renewLock(lockKey, lockOwner, 30).catch(() => {});
  }, 10_000);

  try {
    const latestExecution = await Execution.findById(executionId);
    const latestCursor = latestExecution.cursors.id(cursorId);
    const duration = (performance.now() - startTime).toFixed(2);

    if (!executionError && finalOutputs.__skipped) {
      // SKIPPED PATH — the node declined to run and said so in its payload
      // instead of throwing. It did no work, so it is charged nothing, and the
      // branch stops here unless the user wired a failure edge to handle it.
      const skipReason = finalOutputs.__skipReason || `Node "${node.type}" was skipped.`;

      await ExecutionData.findOneAndUpdate(
        { executionId: latestExecution._id, nodeId: node.id },
        {
          output: finalOutputs,
          log: {
            nodeType: node.type,
            status: "skipped",
            error: skipReason,
            input: resolvedInput,
            duration,
          },
        },
        { upsert: true },
      );

      latestCursor.status = "skipped";
      latestCursor.errorMessage = skipReason;
      latestCursor.lockedAt = null;
      latestCursor.lockedBy = null;

      console.warn(`[Skipped] Node [${node.id}] (${node.type}) did not run: ${skipReason}`);

      await emitExecutionEvent(latestExecution._id, {
        type: "node_skipped",
        nodeId: node.id,
        message: skipReason,
        meta: { duration },
      });

      emitNodeStatus(execution.automationId?.toString() || execution.workflowId?.toString(), {
        automationId: execution.automationId?.toString() || execution.workflowId?.toString(),
        nodeId: node.id,
        status: "skipped",
        executionId: execution._id?.toString(),
      });

      if (hasFailureBranch(automation, node.id)) {
        await routeEdges(automation, latestExecution, node, finalOutputs, "onFailure", null);
      }
    } else if (!executionError) {
      // SUCCESS PATH
      await ExecutionData.findOneAndUpdate(
        { executionId: latestExecution._id, nodeId: node.id },
        {
          output: finalOutputs,
          log: {
            nodeType: node.type,
            status: "success",
            input: resolvedInput,
            duration,
          },
        },
        { upsert: true },
      );

      latestCursor.status = "completed";
      latestCursor.lockedAt = null;
      latestCursor.lockedBy = null;

      // CREDIT DEDUCTION: Charge after successful execution (atomic $inc)
      await deductCredits(execution.workspaceId, {
        executionId,
        nodeId: node.id,
        nodeType: node.type,
      });

      await emitExecutionEvent(latestExecution._id, {
        type: "node_completed",
        nodeId: node.id,
        meta: { duration },
      });

      emitNodeStatus(execution.automationId?.toString() || execution.workflowId?.toString(), {
        automationId: execution.automationId?.toString() || execution.workflowId?.toString(),
        nodeId: node.id,
        status: "completed",
        executionId: execution._id?.toString(),
      });

      // Condition node false-path: route to "false" edges but keep cursor completed
      if (finalOutputs.__hold || finalOutputs.__stopBranch) {
        // batch incomplete, or deliberately dropped — nothing downstream
      } else if (conditionFalseItems.length > 0) {
        // A batch can split: items that passed still take the true branch
        // instead of being dragged down the false one by their neighbours.
        if (conditionTrueItems.length > 0) {
          await routeEdges(automation, latestExecution, node, conditionTrueItems, "onSuccess", nodeDelayUntil, null, false, conditionTrueItems);
        }
        await routeEdges(automation, latestExecution, node, conditionFalseItems, "onFailure", null, null, false, conditionFalseItems);
      } else if (splitOutputsOn(node) && outputReportsFailure(finalOutputs)) {
        await routeEdges(automation, latestExecution, node, finalOutputs, "onFailure", null);
      } else {
        await routeEdges(
          automation, latestExecution, node, finalOutputs, "onSuccess", nodeDelayUntil,
          finalOutputs.__loopFanOut ? finalOutputs.__loopItems : null,
          finalOutputs.__waitWebhook === true,
        );
      }
    } else {
      // FAILURE PATH — check retry budget
      const currentRetries = latestCursor.retries || 0;
      const category = errorClassification?.category || "unknown";
      const hint = errorClassification?.hint || "";

      // Don't auto-retry errors that won't self-fix on a bare re-run
      const noRetryCategories = ["config", "auth", "expression", "code", "parse", "quota", "network", "timeout"];

      // An upstream Retry node annotates its output with __retryConfig. Clamped
      // because these values reach the executor from user config, and an
      // unbounded maxRetries would park a cursor in the queue indefinitely.
      const retryCfg = resolvedInput?.__retryConfig || {};
      const maxRetries = Number.isFinite(retryCfg.maxRetries)
        ? Math.min(Math.max(Math.trunc(retryCfg.maxRetries), 0), RETRY_MAX_ATTEMPTS)
        : MAX_RETRIES;
      const baseMs = Number.isFinite(retryCfg.delayMs)
        ? Math.min(Math.max(Math.trunc(retryCfg.delayMs), 100), RETRY_MAX_DELAY_MS)
        : RETRY_BASE_MS;

      const shouldRetry = currentRetries < maxRetries && !noRetryCategories.includes(category);

      if (shouldRetry) {
        const backoffMs = retryCfg.backoff === "fixed"
          ? baseMs
          : Math.min(baseMs * Math.pow(2, currentRetries), RETRY_MAX_DELAY_MS);
        console.warn(
          `[Retry ${currentRetries + 1}/${maxRetries}] Node [${node.id}] failed (${category}). ` +
          `Retrying in ${backoffMs}ms... Error: ${executionError}`,
        );

        latestCursor.retries = currentRetries + 1;
        latestCursor.status = "waiting";
        latestCursor.lockedAt = null;
        latestCursor.lockedBy = null;

        await scheduleDelay(
          { executionId: executionId.toString(), cursorId: cursorId.toString() },
          Date.now() + backoffMs,
        );

        await emitExecutionEvent(latestExecution._id, {
          type: "node_retrying",
          nodeId: node.id,
          message: `Retry ${currentRetries + 1}/${maxRetries} in ${backoffMs}ms — ${category} error`,
          meta: { category, hint, retryIn: backoffMs },
        });
      } else {
        const reason = noRetryCategories.includes(category)
          ? `${executionError} [${category} error — auto-retry skipped, fix required]`
          : `${executionError} [failed after ${maxRetries} retries]`;

        console.error(`[Dead] Node [${node.id}] permanently failed: ${reason}`);

        await ExecutionData.findOneAndUpdate(
          { executionId: latestExecution._id, nodeId: node.id },
          {
            log: {
              nodeType: node.type,
              status: "failed",
              error: executionError,
              input: resolvedInput,
              errorCategory: category,
              hint,
              retriesExhausted: shouldRetry ? false : true,
              duration,
            },
          },
          { upsert: true },
        );

        // Split outputs exists so a failure can be handled in the graph instead
        // of killing the run. When the user wired a failure branch, the cursor
        // ends "completed" so finalization doesn't mark the whole execution
        // failed — the node's own log still records the error. With no branch
        // wired, this stays a hard failure and the workflow stops, as before.
        const failureHandled = splitOutputsOn(node) && hasFailureBranch(automation, node.id);

        latestCursor.status = failureHandled ? "completed" : "failed";
        latestCursor.errorMessage = hint ? `${executionError} — ${hint}` : executionError;
        latestCursor.lockedAt = null;
        latestCursor.lockedBy = null;

        await emitExecutionEvent(latestExecution._id, {
          type: "node_failed",
          nodeId: node.id,
          message: executionError,
          meta: { category, hint, duration },
        });

        emitNodeStatus(execution.automationId?.toString() || execution.workflowId?.toString(), {
          automationId: execution.automationId?.toString() || execution.workflowId?.toString(),
          nodeId: node.id,
          status: "failed",
          executionId: execution._id?.toString(),
        });

        // Route to onFailure edges if any
        await routeEdges(
          automation, latestExecution, node,
          [{ json: { error: executionError, category, hint } }],
          "onFailure", null,
        );
      }
    }

    // FINALIZATION: Check if the entire execution is complete
    const stillActive = latestExecution.cursors.some((c) =>
      ["pending", "running", "waiting"].includes(c.status),
    );

    if (!stillActive) {
      const hasFailed = latestExecution.cursors.some((c) => c.status === "failed");
      const hasSkipped = latestExecution.cursors.some((c) => c.status === "skipped");
      latestExecution.status = hasFailed ? "failed" : hasSkipped ? "partial" : "executed";
      latestExecution.completedAt = new Date();

      await emitExecutionEvent(latestExecution._id, {
        type: "execution_completed",
        meta: {
          status: latestExecution.status,
          totalDuration: (performance.now() - startTime).toFixed(2),
        },
      });
    }

    await latestExecution.save();

    // Push real-time state to WebSocket subscribers
    emitExecutionUpdate(executionId.toString(), {
      executionId: executionId.toString(),
      status: latestExecution.status,
      cursors: latestExecution.cursors,
      completedAt: latestExecution.completedAt,
    });
  } finally {
    clearInterval(lockHeartbeat);
    await releaseLock(lockKey, lockOwner);

    if (global.gc && performance.now() - startTime > 5000) global.gc();
  }
}

// ── Helper: instantly mark a cursor as permanently failed ─────────────────────
async function _markCursorFailed(execution, cursor, reason, category = "unknown") {
  cursor.status = "failed";
  cursor.errorMessage = reason;
  cursor.lockedAt = null;
  cursor.lockedBy = null;
  execution.status = "failed";
  execution.completedAt = new Date();
  await execution.save();

  emitExecutionUpdate(execution._id.toString(), {
    executionId: execution._id.toString(),
    status: "failed",
    cursors: execution.cursors,
    completedAt: execution.completedAt,
  });

  console.error(`[Fatal] Cursor ${cursor._id} killed (${category}): ${reason}`);
}

// A node can still produce data only if it sits downstream of something that is
// still alive: a pending/waiting/running cursor, or the node currently routing.
// Anything outside that set is on a branch a condition already refused — waiting
// on it would deadlock the merge forever.
function liveReachableNodes(automation, execution, sourceNodeId) {
  const adjacency = new Map();
  for (const e of automation.edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source).push(e.target);
  }

  const frontier = [sourceNodeId];
  for (const c of execution.cursors) {
    if (c.status === "pending" || c.status === "running" || c.status === "waiting") {
      frontier.push(c.nodeId);
    }
  }

  const seen = new Set(frontier);
  const stack = [...frontier];
  while (stack.length > 0) {
    for (const next of adjacency.get(stack.pop()) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

// ── Success / failure branch classification ──────────────────────────────────
// Every edge leaving a node belongs to exactly one branch, decided here and
// nowhere else. `failed` is the Split-outputs handle, `onFailure`/`error` the
// legacy single error dot, `false` the condition node's own branch. Anything
// else — `success`, `output`, `true`, or no handle at all — is the success
// branch. `onFailure` was absent from this set, so every edge drawn from the
// legacy error dot was classified as a success edge and fired on success.
const FAILURE_HANDLES = new Set(["failed", "onFailure", "error", "false"]);

export function isFailureEdge(edge) {
  return edge.type === "onFailure" || FAILURE_HANDLES.has(edge.sourceHandle);
}

function splitOutputsOn(node) {
  return !!node?.data?.config?.splitOutputs;
}

function hasFailureBranch(automation, nodeId) {
  return automation.edges.some((e) => e.source === nodeId && isFailureEdge(e));
}

// A node that cannot run at all returns { success:false, error, skipped:true }
// instead of throwing, so classifyError never sees it. Keyed on `skipped` alone:
// a bare success:false stays ordinary data unless the node opts into Split
// outputs, which is a separate contract with its own test.
function outputIsSkipped(raw) {
  return !!raw && raw.skipped === true && raw.success === false;
}

// A node can report failure in its output without throwing. Under Split outputs
// the user has explicitly asked for a failure branch, so an output that says it
// failed must take that branch instead of silently powering the success path.
function outputReportsFailure(outputs) {
  const json = outputs?.[0]?.json;
  return !!json && json.success === false && !!json.error;
}

// ── Edge router with fresh merge check ───────────────────────────────────────
// fanOutItems: when set (loop node), spawn one cursor per item in this array
async function routeEdges(
  automation,
  execution,
  sourceNode,
  outputData,
  edgeType,
  delayUntil,
  fanOutItems = null,
  webhookPark = false,
  branchItems = null,
) {
  const edges = automation.edges.filter((e) => {
    if (e.source !== sourceNode.id) return false;
    return (isFailureEdge(e) ? "onFailure" : "onSuccess") === edgeType;
  });

  // Runtime cycle guard: cap total cursors
  if (execution.cursors.length >= MAX_CURSORS_PER_EXECUTION) {
    console.error(`Execution ${execution._id} hit cursor limit (${MAX_CURSORS_PER_EXECUTION}). Stopping.`);
    return;
  }

  const toEnqueue = [];

  for (const edge of edges) {
    const evaluationContext = outputData[0]?.json || {};

    if (evaluateCondition(edge.condition, evaluationContext)) {
      const targetNodeId = edge.target;

      // MERGE CHECK: Re-query ExecutionData for fresh state.
      // Only count data-flow edges (targetHandle null or "input") — agent slot
      // edges (llm, memory, tools) connect sub-nodes that never execute, so
      // they must never block the merge-readiness check.
      const allIncoming = automation.edges.filter(
        (e) => e.target === targetNodeId && isDataFlowHandle(e.targetHandle),
      );

      if (allIncoming.length > 1) {
        const completedData = await ExecutionData.find({ executionId: execution._id });
        const freshContext = {};
        completedData.forEach((doc) => { freshContext[doc.nodeId] = doc.output; });

        const stillLive = liveReachableNodes(automation, execution, sourceNode.id);
        const ready = allIncoming.every(
          (e) =>
            e.source === sourceNode.id ||
            freshContext[e.source] !== undefined ||
            !stillLive.has(e.source),
        );
        if (!ready) continue;
      }

      // LOOP FAN-OUT: spawn one cursor per item, each carrying its own input snapshot
      if (fanOutItems && fanOutItems.length > 0) {
        // Guard: don't exceed cursor cap with fan-out
        const slotsLeft = MAX_CURSORS_PER_EXECUTION - execution.cursors.length;
        const itemsToSpawn = fanOutItems.slice(0, slotsLeft);

        if (itemsToSpawn.length < fanOutItems.length) {
          console.warn(`[LoopFanOut] Execution ${execution._id} cursor cap reached — spawned ${itemsToSpawn.length}/${fanOutItems.length} items`);
        }

        for (const loopItem of itemsToSpawn) {
          const newCursor = {
            nodeId: targetNodeId,
            status: delayUntil || webhookPark ? "waiting" : "pending",
            waitingForWebhook: webhookPark,
            retries: 0,
            lockedAt: null,
            lockedBy: null,
            parentCursorId: null,
            // Store per-item input so the target node uses this item's data, not the whole array
            _loopItemOverride: loopItem.json,
          };
          execution.cursors.push(newCursor);
          toEnqueue.push({
            payload: {
              executionId: execution._id.toString(),
              cursorId: execution.cursors.at(-1)._id.toString(),
            },
            delayed: !!delayUntil,
          });
        }
        // Only create fan-out cursors for this edge; skip normal single-cursor creation
        continue;
      }

      const newCursor = {
        nodeId: targetNodeId,
        status: delayUntil || webhookPark ? "waiting" : "pending",
        waitingForWebhook: webhookPark,
        retries: 0,
        lockedAt: null,
        lockedBy: null,
        // Only when this branch is the target's sole input — a join needs every
        // parent's full output, not one branch's slice of it.
        _branchItems: branchItems && allIncoming.length <= 1 ? branchItems.map((o) => o.json) : null,
      };

      execution.cursors.push(newCursor);

      toEnqueue.push({
        payload: {
          executionId: execution._id.toString(),
          cursorId: execution.cursors.at(-1)._id.toString(),
        },
        delayed: !!delayUntil,
      });
    }
  }

  // Save cursors to MongoDB FIRST so they exist when the worker picks them up
  if (toEnqueue.length > 0) {
    await execution.save();

    if (webhookPark) return; // nothing to enqueue — the wait webhook wakes these

    for (const { payload, delayed } of toEnqueue) {
      if (delayed) {
        await scheduleDelay(payload, delayUntil.getTime());
      } else {
        await enqueueCursor(payload);
      }
    }
  }
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
const withTimeout = (promise, ms) => {
  if (!ms || ms <= 0) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Node timeout: exceeded ${ms}ms limit`)),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

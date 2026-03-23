import Execution from "../../models/execution.model.js";
import ExecutionData from "../../models/executionData.model.js";
import Automation from "../../models/automation.model.js";
import { performance } from "perf_hooks";
import { nodeRegistry } from "../../nodes/index.js";
import { enqueueCursor } from "./cursor.queue.js";
import { evaluateCondition } from "../../modules/automation/engine/condition.evaluator.js";
import { emitExecutionEvent } from "../execution/execution.events.js";
import { resolveConfig } from "../../modules/automation/engine/expression.parser.js";

import { acquireLock, releaseLock } from "../../infra/redis.lock.js";
import { emitExecutionUpdate } from "../../infra/socket.server.js";
import { RedisKeys } from "../../infra/redis.keys.js";
import { scheduleDelay } from "../../infra/delay.scheduler.js";
import { checkCredits, deductCredits } from "../../infra/credit.engine.js";

const NODE_TIMEOUT_MS = 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const MAX_CURSORS_PER_EXECUTION = 500;

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
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return {
      category: "auth",
      message: msg,
      hint: "Authentication failed. Check your credentials in the encrypted vault — API key may be expired or incorrect.",
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
    await emitExecutionEvent(execution._id, {
      type: "quota_exceeded",
      nodeId: node.id,
      message: `Credit limit reached (${creditCheck.creditsUsed}/${creditCheck.monthlyLimit}). Node "${node.type}" costs ${creditCheck.cost} credits.`,
      meta: { plan: creditCheck.plan, remaining: creditCheck.remaining, cost: creditCheck.cost },
    });
    await _markCursorFailed(
      execution, cursor,
      `Credit quota exceeded: ${creditCheck.remaining} remaining, need ${creditCheck.cost}. Upgrade your plan to continue.`,
      "quota",
    );
    return;
  }

  let finalOutputs = [];
  let nodeDelayUntil = null;
  let executionError = null;
  let errorClassification = null;
  let dynamicContext = {};
  let resolvedInput = null;

  try {
    await emitExecutionEvent(execution._id, {
      type: "node_started",
      nodeId: node.id,
      message: `Executing ${node.type} node "${node.data?.label || node.id}"`,
    });

    // VAULT RECONSTRUCTION: Retrieve all historical data for this execution
    const allPastData = await ExecutionData.find({ executionId: execution._id });
    allPastData.forEach((doc) => {
      dynamicContext[doc.nodeId] = doc.output;
    });

    // Identify inputs (auto-grab from parents or self-trigger)
    const incomingEdges = automation.edges.filter((e) => e.target === node.id);
    let inputItems = [];

    if (incomingEdges.length === 0) {
      inputItems = dynamicContext[node.id] || [{ json: {} }];
    } else {
      for (const edge of incomingEdges) {
        const sourceData = dynamicContext[edge.source];
        if (Array.isArray(sourceData)) inputItems.push(...sourceData);
      }
    }

    if (inputItems.length === 0) inputItems = [{ json: {} }];

    // HANDLE-AWARE ROUTING: For AI Agent nodes, separate handle-tagged
    // edge data into dedicated dependency fields (_memory, _tools).
    // Edges with targetHandle "memory" or "tools" feed into config, not input.
    let handleDeps = null;
    if (node.data?.backendType === "ai_agent" && incomingEdges.length > 0) {
      handleDeps = {};
      for (const edge of incomingEdges) {
        const handle = edge.targetHandle;
        if (handle && handle !== "input") {
          const sourceData = dynamicContext[edge.source];
          const firstOutput = Array.isArray(sourceData) ? sourceData[0]?.json : null;
          if (handle === "memory") {
            handleDeps._memory = firstOutput;
          } else if (handle === "tools") {
            // Tools handle can receive from multiple edges — collect all
            if (!handleDeps._tools) handleDeps._tools = [];
            if (firstOutput) handleDeps._tools.push(firstOutput);
          }
        }
      }
    }

    // Store what went into this node for diagnostics
    resolvedInput = inputItems[0]?.json || {};

    // KERNEL EXECUTION: Run node with timeout guard
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
        handler.run(resolvedConfig, item.json, { workspaceId: execution.workspaceId }),
        NODE_TIMEOUT_MS,
      );

      // Handle custom Delay/Sleep requests from nodes
      if (rawOutput && rawOutput.__delay) {
        nodeDelayUntil = new Date(rawOutput.resumeAfter);
        rawOutput = { delayed: true, requestedSleep: true };
      }

      const formatted = Array.isArray(rawOutput)
        ? rawOutput.map((r) => (r.json ? r : { json: r }))
        : [{ json: rawOutput }];

      finalOutputs.push(...formatted);
    }
  } catch (err) {
    errorClassification = classifyError(err, node.type, node.data);
    executionError = errorClassification.message;
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

  try {
    const latestExecution = await Execution.findById(executionId);
    const latestCursor = latestExecution.cursors.id(cursorId);
    const duration = (performance.now() - startTime).toFixed(2);

    if (!executionError) {
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

      await routeEdges(
        automation, latestExecution, node, finalOutputs, "onSuccess", nodeDelayUntil,
      );
    } else {
      // FAILURE PATH — check retry budget
      const currentRetries = latestCursor.retries || 0;
      const category = errorClassification?.category || "unknown";
      const hint = errorClassification?.hint || "";

      // Don't auto-retry config/auth errors — they won't self-fix
      const noRetryCategories = ["config", "auth", "expression", "code", "parse", "quota"];
      const shouldRetry = currentRetries < MAX_RETRIES && !noRetryCategories.includes(category);

      if (shouldRetry) {
        const backoffMs = RETRY_BASE_MS * Math.pow(2, currentRetries);
        console.warn(
          `[Retry ${currentRetries + 1}/${MAX_RETRIES}] Node [${node.id}] failed (${category}). ` +
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
          message: `Retry ${currentRetries + 1}/${MAX_RETRIES} in ${backoffMs}ms — ${category} error`,
          meta: { category, hint, retryIn: backoffMs },
        });
      } else {
        const reason = noRetryCategories.includes(category)
          ? `${executionError} [${category} error — auto-retry skipped, fix required]`
          : `${executionError} [failed after ${MAX_RETRIES} retries]`;

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

        latestCursor.status = "failed";
        latestCursor.errorMessage = hint ? `${executionError} — ${hint}` : executionError;
        latestCursor.lockedAt = null;
        latestCursor.lockedBy = null;

        await emitExecutionEvent(latestExecution._id, {
          type: "node_failed",
          nodeId: node.id,
          message: executionError,
          meta: { category, hint, duration },
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
      latestExecution.status = hasFailed ? "failed" : "executed";
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

// ── Edge router with fresh merge check ───────────────────────────────────────
async function routeEdges(
  automation,
  execution,
  sourceNode,
  outputData,
  edgeType,
  delayUntil,
) {
  const edges = automation.edges.filter((e) => {
    if (e.source !== sourceNode.id) return false;
    const isFailurePath = e.sourceHandle === 'error' || e.sourceHandle === 'false' || e.type === 'onFailure';
    const normalizedType = isFailurePath ? "onFailure" : "onSuccess";
    return normalizedType === edgeType;
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

      // MERGE CHECK: Re-query ExecutionData for fresh state
      const allIncoming = automation.edges.filter((e) => e.target === targetNodeId);

      if (allIncoming.length > 1) {
        const completedData = await ExecutionData.find({ executionId: execution._id });
        const freshContext = {};
        completedData.forEach((doc) => { freshContext[doc.nodeId] = doc.output; });

        const ready = allIncoming.every(
          (e) => e.source === sourceNode.id || freshContext[e.source] !== undefined,
        );
        if (!ready) continue;
      }

      const newCursor = {
        nodeId: targetNodeId,
        status: delayUntil ? "waiting" : "pending",
        retries: 0,
        lockedAt: null,
        lockedBy: null,
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
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Node timeout: exceeded ${ms}ms limit`)),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

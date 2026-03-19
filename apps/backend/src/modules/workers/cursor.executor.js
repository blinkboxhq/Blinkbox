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
 * Core cursor processor with atomic locking, retry logic, and crash recovery.
 */
export async function processCursor({ executionId, cursorId }) {
  const startTime = performance.now();
  const cellId = process.pid;

  // 2.1 ATOMIC LOCK: Only claim cursor if it's still "pending"
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
      arrayFilters: [{ "c._id": cursorId, "c.status": "pending" }],
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
    await _markCursorFailed(execution, cursor, "CRITICAL: Automation Blueprint Missing");
    return;
  }

  const node = automation.nodes.find((n) => n.id === cursor.nodeId);
  if (!node) {
    await _markCursorFailed(execution, cursor, `Node [${cursor.nodeId}] not found in blueprint.`);
    return;
  }

  const handler = nodeRegistry[node.type];
  if (!handler) {
    await _markCursorFailed(
      execution,
      cursor,
      `FATAL: Node type [${node.type}] is missing from the Registry.`,
    );
    return;
  }

  // CREDIT GATE: Check quota before executing this node
  const creditCheck = await checkCredits(execution.workspaceId, node.type);
  if (!creditCheck.allowed) {
    await emitExecutionEvent(execution._id, {
      type: "quota_exceeded",
      nodeId: node.id,
      message: `Credit limit reached (${creditCheck.creditsUsed}/${creditCheck.monthlyLimit}). ` +
        `Node "${node.type}" costs ${creditCheck.cost} credits. Upgrade plan to continue.`,
      meta: { plan: creditCheck.plan, remaining: creditCheck.remaining, cost: creditCheck.cost },
    });
    await _markCursorFailed(
      execution,
      cursor,
      `Quota exceeded: ${creditCheck.remaining} credits remaining, need ${creditCheck.cost}`,
    );
    return;
  }

  let finalOutputs = [];
  let nodeDelayUntil = null;
  let executionError = null;
  let dynamicContext = {};

  try {
    await emitExecutionEvent(execution._id, {
      type: "node_started",
      nodeId: node.id,
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

    // KERNEL EXECUTION: Run node with timeout guard
    for (let i = 0; i < inputItems.length; i++) {
      const item = inputItems[i];
      const resolvedConfig = resolveConfig(node.data, item.json, dynamicContext, i);

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
    executionError = err.message;
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

    if (!executionError) {
      // SUCCESS PATH
      await ExecutionData.findOneAndUpdate(
        { executionId: latestExecution._id, nodeId: node.id },
        {
          output: finalOutputs,
          log: {
            nodeType: node.type,
            status: "success",
            duration: (performance.now() - startTime).toFixed(2),
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
      });

      await routeEdges(
        automation,
        latestExecution,
        node,
        finalOutputs,
        "onSuccess",
        nodeDelayUntil,
      );
    } else {
      // FAILURE PATH — check retry budget
      const currentRetries = latestCursor.retries || 0;

      if (currentRetries < MAX_RETRIES) {
        const backoffMs = RETRY_BASE_MS * Math.pow(2, currentRetries);
        console.warn(
          `[Retry ${currentRetries + 1}/${MAX_RETRIES}] Node [${node.id}] failed. ` +
          `Retrying in ${backoffMs}ms... Error: ${executionError}`,
        );

        latestCursor.retries = currentRetries + 1;
        latestCursor.status = "waiting";
        latestCursor.lockedAt = null;
        latestCursor.lockedBy = null;

        // Schedule retry via Redis Sorted Set (ZADD) instead of MongoDB resumeAt
        await scheduleDelay(
          { executionId: executionId.toString(), cursorId: cursorId.toString() },
          Date.now() + backoffMs,
        );

        await emitExecutionEvent(latestExecution._id, {
          type: "node_retrying",
          nodeId: node.id,
          message: `Retry ${currentRetries + 1}/${MAX_RETRIES} in ${backoffMs}ms`,
        });
      } else {
        console.error(
          `[Dead] Node [${node.id}] permanently failed after ${MAX_RETRIES} retries. ` +
          `Error: ${executionError}`,
        );

        await ExecutionData.findOneAndUpdate(
          { executionId: latestExecution._id, nodeId: node.id },
          {
            log: {
              nodeType: node.type,
              status: "failed",
              error: executionError,
              retriesExhausted: true,
            },
          },
          { upsert: true },
        );

        latestCursor.status = "failed";
        latestCursor.lockedAt = null;
        latestCursor.lockedBy = null;

        await emitExecutionEvent(latestExecution._id, {
          type: "node_failed",
          nodeId: node.id,
          message: executionError,
        });

        // Route to onFailure edges if any
        await routeEdges(
          automation,
          latestExecution,
          node,
          [{ json: { error: executionError } }],
          "onFailure",
          null,
        );
      }
    }

    // FINALIZATION: Check if the entire execution is complete
    const stillActive = latestExecution.cursors.some((c) =>
      ["pending", "running", "waiting"].includes(c.status),
    );

    if (!stillActive) {
      latestExecution.status = latestExecution.cursors.some((c) => c.status === "failed")
        ? "failed"
        : "executed";
      latestExecution.completedAt = new Date();

      await emitExecutionEvent(latestExecution._id, { type: "execution_completed" });
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
async function _markCursorFailed(execution, cursor, reason) {
  cursor.status = "failed";
  cursor.lockedAt = null;
  cursor.lockedBy = null;
  execution.status = "failed";
  execution.completedAt = new Date();
  await execution.save();
  console.error(`[Fatal] Cursor ${cursor._id} killed: ${reason}`);
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
  const edges = automation.edges.filter(
    (e) => e.source === sourceNode.id && e.type === edgeType,
  );

  // 3.7 Runtime cycle guard: cap total cursors
  if (execution.cursors.length >= MAX_CURSORS_PER_EXECUTION) {
    console.error(`Execution ${execution._id} hit cursor limit (${MAX_CURSORS_PER_EXECUTION}). Stopping.`);
    return;
  }

  for (const edge of edges) {
    const evaluationContext = outputData[0]?.json || {};

    if (evaluateCondition(edge.condition, evaluationContext)) {
      const targetNodeId = edge.target;

      // 2.2 MERGE CHECK: Re-query ExecutionData for fresh state
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

      const cursorPayload = {
        executionId: execution._id.toString(),
        cursorId: execution.cursors.at(-1)._id.toString(),
      };

      if (delayUntil) {
        // Schedule via Redis Sorted Set (ZADD) — the delay scheduler will promote it
        await scheduleDelay(cursorPayload, delayUntil.getTime());
      } else {
        await enqueueCursor(cursorPayload);
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

import Execution from "../../models/execution.model.js";
import ExecutionData from "../../models/executionData.model.js"; // 🛡️ The Vault
import Automation from "../../models/automation.model.js";
import { emitExecutionEvent } from "../execution/execution.events.js";
import { enqueueCursor } from "../workers/cursor.queue.js";

export async function executeAutomation(
  automation,
  payload = {},
  options = {},
) {
  const {
    executionId = null,
    workspaceId = "default",
    entryNodeId = automation.entryNodeId,
  } = options;

  // The unique index on {automationId, idempotencyKey, workspaceId} indexes
  // null keys too (compound sparse indexes skip a doc only when ALL fields
  // are missing), so a stored null collides on the second keyless run —
  // synthesize a unique key instead of ever persisting null.
  const callerKey = options.idempotencyKey || null;
  const idempotencyKey = callerKey || crypto.randomUUID();

  // Normalize the incoming Webhook/API payload
  const triggerItems = Array.isArray(payload)
    ? payload.map((item) => (item.json ? item : { json: item }))
    : [{ json: payload }];

  let execution;
  if (executionId) {
    execution = await Execution.findById(executionId);
  } else {
    const dedupeQuery = callerKey
      ? { automationId: automation._id, idempotencyKey: callerKey, workspaceId }
      : null;

    if (dedupeQuery) {
      const existing = await Execution.findOne(dedupeQuery);
      // The winner of the race already enqueued its cursor — don't re-run
      if (existing) return existing;
    }

    try {
      execution = await Execution.create({
        automationId: automation._id,
        workspaceId,
        name: automation.name,
        trigger: automation.trigger,
        idempotencyKey,
        status: "pending",
        cursors: [
          {
            nodeId: entryNodeId,
            status: "pending",
            retries: 0,
            resumeAt: null,
            lockedAt: null,
            lockedBy: null,
            parentCursorId: null,
          },
        ],
      });
    } catch (err) {
      if (err.code === 11000 && dedupeQuery) {
        const existing = await Execution.findOne(dedupeQuery);
        if (existing) return existing;
      }
      throw err;
    }
  }

  if (!execution) {
    throw new Error("Execution not found or failed to create");
  }

  // Trigger data goes to the ExecutionData vault, not the main document.
  // findOneAndUpdate so the payload is injected even when the API
  // controller pre-created the Execution ID.
  await ExecutionData.findOneAndUpdate(
    { executionId: execution._id, nodeId: entryNodeId },
    {
      output: triggerItems,
      log: {
        nodeType: automation.trigger,
        status: "success",
        input: { payload: triggerItems },
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await emitExecutionEvent(execution._id, {
    type: "execution_started",
    meta: { workspaceId },
  });

  await enqueueCursor({
    executionId: execution._id.toString(),
    cursorId: execution.cursors[0]._id.toString(),
  });

  if (execution.status !== "pending") {
    execution.status = "pending";
    await execution.save();
  }

  return execution;
}

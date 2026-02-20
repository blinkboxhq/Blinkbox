import Execution from "../../models/execution.model.js";
import Automation from "../../models/automation.model.js";
import { emitExecutionEvent } from "../execution/execution.events.js";
import { enqueueCursor } from "../workers/cursor.queue.js";

/**
 * ===============================
 * PHASE 8 EXECUTION BOOTSTRAPPER
 * (no execution here — only orchestration)
 * ===============================
 */
export async function executeAutomation(
  automation,
  payload = {},
  options = {},
) {
  const {
    executionId = null,
    idempotencyKey = null,
    workspaceId = "default",
  } = options;

  // -------------------------------
  // Create or load execution
  // -------------------------------
  const execution = executionId
    ? await Execution.findById(executionId)
    : await Execution.create({
        automationId: automation._id,
        workspaceId,
        name: automation.name,
        trigger: automation.trigger,
        idempotencyKey,
        context: payload,
        status: "pending",
        cursors: [
          {
            nodeId: automation.entryNodeId,
            status: "pending",
            retries: 0,
            resumeAt: null,
            lockedAt: null,
            lockedBy: null,
            parentCursorId: null,
          },
        ],
      });

  if (!execution) {
    throw new Error("Execution not found or failed to create");
  }

  // -------------------------------
  // Emit execution start
  // -------------------------------
  await emitExecutionEvent(execution._id, {
    type: "execution_started",
    meta: { workspaceId },
  });

  // -------------------------------
  // Enqueue FIRST cursor
  // -------------------------------
  const entryCursor = execution.cursors[0];

  await enqueueCursor({
    executionId: execution._id.toString(),
    cursorId: entryCursor._id.toString(),
    workspaceId,
  });

  // -------------------------------
  // Mark execution as active
  // -------------------------------
  execution.status = "pending";
  await execution.save();

  return execution;
}

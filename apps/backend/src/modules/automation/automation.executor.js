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
    idempotencyKey = null,
    workspaceId = "default",
  } = options;

  // Normalize the incoming Webhook/API payload
  const triggerItems = Array.isArray(payload)
    ? payload.map((item) => (item.json ? item : { json: item }))
    : [{ json: payload }];

  const execution = executionId
    ? await Execution.findById(executionId)
    : await Execution.create({
        automationId: automation._id,
        workspaceId,
        name: automation.name,
        trigger: automation.trigger,
        idempotencyKey,
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

  // 🛡️ Save the trigger data safely to the Vault, NOT the main document
  // 🛡️ THE FIX: Dynamically link the payload to the EXACT ID of the entry node
  // 🛡️ Save the trigger data safely to the Vault, NOT the main document
  // 🛡️ THE FIX: Dynamically link the payload to the EXACT ID of the entry node
  // 🛡️ Save the trigger data safely to the Vault, NOT the main document
  // We use findOneAndUpdate so the payload is ALWAYS safely injected,
  // even if the API Controller pre-created the Execution ID!
  await ExecutionData.findOneAndUpdate(
    { executionId: execution._id, nodeId: automation.entryNodeId },
    {
      output: triggerItems,
      log: {
        nodeType: automation.trigger,
        status: "success",
        input: { payload: triggerItems },
      },
    },
    { upsert: true, new: true },
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

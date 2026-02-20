import Execution from "../../models/execution.model.js";

export async function emitExecutionEvent(
  executionId,
  { type, nodeId = null, message = "", meta = {} },
) {
  await Execution.findByIdAndUpdate(executionId, {
    $push: {
      events: {
        type,
        nodeId,
        message,
        meta,
        at: new Date(),
      },
    },
  });
}

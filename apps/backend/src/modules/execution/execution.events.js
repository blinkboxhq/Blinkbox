import Execution from "../../models/execution.model.js";

export async function emitExecutionEvent(
  executionId,
  { type, nodeId = null, message = "", meta = {} },
) {
  await Execution.findByIdAndUpdate(executionId, {
    $push: {
      events: {
        $each: [{
          type,
          nodeId,
          message,
          meta,
          at: new Date(),
        }],
        $slice: -500,
      },
    },
  });
}

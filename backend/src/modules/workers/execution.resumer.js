import Execution from "../../models/execution.model.js";

const STALE_MS = 60 * 1000;

export async function startExecutionResumer() {
  setInterval(async () => {
    const stale = new Date(Date.now() - STALE_MS);

    const executions = await Execution.find({
      "cursors.status": "running",
      "cursors.lockedAt": { $lte: stale },
    });

    for (const execution of executions) {
      execution.cursors.forEach((cursor) => {
        if (cursor.status === "running" && cursor.lockedAt <= stale) {
          cursor.status = "pending";
          cursor.lockedAt = null;
          cursor.lockedBy = null;
        }
      });

      await execution.save();
    }
  }, 15_000);
}

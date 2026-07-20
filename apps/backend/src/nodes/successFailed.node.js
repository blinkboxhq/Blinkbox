/**
 * SUCCESS/FAILED NODE — explicitly mark a branch outcome.
 *
 * outcome: 'success' (default) — passes input through, continues to next nodes
 * outcome: 'failed'            — throws with the configured message, halts branch
 */
export default {
  async run(config, input) {
    const outcome = config.outcome ?? "success";
    const message = config.message || "Branch marked as failed";

    if (outcome === "failed") {
      // Flagged so the executor routes straight to the failed edge instead of
      // spending the retry budget — re-running cannot change a decided outcome.
      const err = new Error(message);
      err.branchFailure = true;
      throw err;
    }

    return { ...input, outcome: "success", message: config.message || undefined };
  },
};

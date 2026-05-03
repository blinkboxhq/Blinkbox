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
      throw new Error(message);
    }

    return { ...input, __outcome: "success", message: config.message || undefined };
  },
};

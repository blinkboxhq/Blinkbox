/**
 * STOP & ERROR NODE — halt workflow with a custom error message.
 * Always throws. Designed to be placed on a specific branch to
 * intentionally fail with a human-readable error.
 */
export default {
  async run(config) {
    const message = config.message || "Workflow stopped by Stop & Error node";
    const code = config.code || "WORKFLOW_ERROR";
    const err = new Error(`[${code}] ${message}`);
    err.code = code;
    err.branchFailure = true;
    throw err;
  },
};

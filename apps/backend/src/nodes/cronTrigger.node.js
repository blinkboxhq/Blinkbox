/**
 * CRON TRIGGER NODE
 *
 * Schedule-based genesis trigger. The cron scheduler service fires this
 * automation on schedule; this node injects execution metadata downstream.
 *
 * Output:
 *   triggeredAt  — ISO timestamp of when the cron fired
 *   schedule     — The cron expression that triggered this execution
 *   executionId  — The execution ID (injected by executor from trigger data)
 */

export default {
  async run(config, input) {
    return {
      ...input,
      triggeredAt: input.triggeredAt || new Date().toISOString(),
      schedule: config.schedule || input.schedule || "unknown",
      triggerType: "cron",
    };
  },
};

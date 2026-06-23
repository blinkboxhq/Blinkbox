/**
 * RETRY NODE — pass-through that annotates config for the next node's retry behavior.
 * The executor already has built-in retry support; this node just propagates
 * user-configured retry settings to the downstream execution context.
 */
export default {
  async run(config, input) {
    return {
      ...input,
      __retryConfig: {
        maxRetries: config.maxRetries ?? 3,
        delayMs: config.delayMs ?? 1000,
        backoff: config.backoff ?? "fixed",
      },
    };
  },
};

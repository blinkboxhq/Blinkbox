/**
 * WAIT FOR EVENT NODE — pause execution until a webhook or timeout.
 *
 * Uses the delay scheduler: the cursor suspends itself and resumes
 * when the configured webhook URL is called or the timeout expires.
 *
 * Config:
 *   timeoutMs  — max wait time in milliseconds (default: 24h)
 *   resumeKey  — unique key to correlate the incoming webhook to this cursor
 */
export default {
  async run(config, input) {
    const timeoutMs = config.timeoutMs ?? 24 * 60 * 60 * 1000;

    // Signal the executor to pause this cursor until the timeout or an event
    return {
      ...input,
      __delay: true,
      resumeAfter: new Date(Date.now() + timeoutMs).toISOString(),
      __waitForEvent: true,
      resumeKey: config.resumeKey || null,
    };
  },
};

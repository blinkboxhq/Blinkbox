/**
 * APPROVAL NODE — "The Governor"
 *
 * Human-in-the-Loop gate for the cursor-based execution engine.
 *
 * In the cursor engine the gate is the delay mechanism: everything downstream
 * is parked as "waiting" until the timeout lapses or someone resumes the run
 * (POST /api/executions/resume/:executionId). Approving is resuming.
 *
 * In the Temporal engine, this node is handled directly in workflows.ts
 * using Temporal's native signal + condition primitives. This file is
 * only used by the cursor-based engine path via nodeRegistry.
 *
 * Config (from frontend panel):
 *   label               — Display name shown in notifications
 *   notifyChannels      — ["email"] | ["slack"] | ["email", "slack"]
 *   notifyTo            — Email address for notification
 *   smtpCredentialId    — Vault ref for SMTP credentials
 *   slackCredentialId   — Vault ref for Slack bot token
 *   slackChannel        — Slack channel ID
 *   timeoutMs           — Max wait time (default: 30 days)
 *
 * Output:
 *   { status, label, notifyTo, notifyChannels, waitingSince }
 */

const DEFAULT_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

const BACKEND_URL =
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

export default {
  async run(config, input, context = {}) {
    const {
      label = "Approval Required",
      notifyTo,
      notifyChannels = ["email"],
    } = config;

    const timeoutMs = Number.isFinite(Number(config.timeoutMs))
      ? Number(config.timeoutMs)
      : DEFAULT_TIMEOUT_MS;

    // __delay is what actually parks the branch. Without it the gate returned
    // metadata and the run carried straight on — approving everything by default.
    return {
      ...(input && typeof input === "object" && !Array.isArray(input) ? input : {}),
      __delay: true,
      resumeAfter: new Date(Date.now() + timeoutMs).toISOString(),
      status: "waiting",
      nodeId: context.nodeId || null,
      label,
      notifyTo,
      notifyChannels,
      waitingSince: new Date().toISOString(),
      message:
        "Execution paused — waiting for human approval. " +
        `Notification sent to: ${notifyTo || "(not configured)"}`,
    };
  },
};

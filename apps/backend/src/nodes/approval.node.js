/**
 * APPROVAL NODE — "The Governor"
 *
 * Human-in-the-Loop gate for the cursor-based execution engine.
 *
 * When this node executes in the cursor engine, it sets the cursor to
 * "waiting" status and sends a notification. The cursor stays parked
 * until an external signal (POST /api/automations/signal/:workflowId)
 * resumes it.
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
 *   { approved, status, nodeId, message, waitingSince }
 */

const BACKEND_URL =
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

export default {
  async run(config, input, context = {}) {
    const {
      label = "Approval Required",
      notifyTo,
      notifyChannels = ["email"],
    } = config;

    // In the cursor engine, the actual blocking is handled by the executor
    // setting the cursor to "waiting". This run() returns metadata that the
    // executor stores, then the cursor is parked. When the external signal
    // hits the resume endpoint, the executor re-enqueues the cursor.
    //
    // We return a "waiting" sentinel that the cursor executor recognizes.
    return {
      __approvalWaiting: true,
      approved: null,
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

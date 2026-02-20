/**
 * Action Registry
 * Maps action type → action definition
 */

import sendEmail from "../../nodes/sendEmail.node.js";
import callWebhook from "../../nodes/callWebhook.node.js";

export const actionRegistry = {
  send_email: {
    name: "Send Email",
    handler: sendEmail,
    retryable: true,
    configSchema: ["to", "subject", "body"],
  },

  call_webhook: {
    name: "Call Webhook",
    handler: callWebhook,
    retryable: true,
    configSchema: ["url"],
  },
};

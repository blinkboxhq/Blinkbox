/**
 * SLACK NODE — slim entry. Resolves the Bot Token, then delegates to the
 * modular router in _packaged/slack/. 30 operation keys across message, file,
 * channel and user resources.
 *
 * Auth: Slack Bot Token (xoxb-...) from the credential vault.
 * Note: legacy webhookUrl mode (postMessage only) still bypasses token resolution.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runSlack, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/slack/router.js";
import { makeReq } from "../_packaged/slack/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Slack: Unknown operation "${operation}".`, skipped: true };

    // Legacy webhook mode bypasses token resolution
    if (operation === "postMessage" && config.webhookUrl && !config.credentialId) {
      return runSlack(config, makeReq(null));
    }

    if (!config.credentialId) {
      return { success: false, error: "Slack: No credential selected — pick a Slack Bot Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Slack");
    } catch (e) {
      return { success: false, error: `Slack: Could not resolve credential — ${e.message}`, skipped: true };
    }

    // Allow forwarding attachments from previous node output (standalone canvas use)
    let resolvedConfig = config;
    if (operation === "uploadFile" && typeof config.attachmentIndex === "number" && !config.attachments) {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) resolvedConfig = { ...config, attachments: [att] };
    }

    return runSlack(resolvedConfig, makeReq(token));
  },
};

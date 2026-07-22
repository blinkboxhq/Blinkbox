/**
 * SLACK NODE — slim entry. Resolves the Bot Token, then delegates to the
 * modular router in _packaged/slack/. 30 operation keys across message, file,
 * channel and user resources.
 *
 * Auth: Slack Bot Token (xoxb-...) from the user's own Slack app, stored in the
 * credential vault. This is the only supported auth — every operation requires a
 * bot-token credential.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runSlack, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/slack/router.js";
import { makeReq } from "../_packaged/slack/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Slack: Unknown operation "${operation}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Slack: No credential selected — add your Slack app's Bot User OAuth Token (xoxb-…) in the Vault and pick it here.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Slack");
    } catch (e) {
      return { success: false, error: `Slack: Could not resolve credential — ${e.message}`, skipped: true };
    }

    if (!/^xoxb-/.test(String(token || ""))) {
      return { success: false, error: "Slack: This credential is not a Bot User OAuth Token. Paste the xoxb-… token from your own Slack app's OAuth & Permissions page.", skipped: true };
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

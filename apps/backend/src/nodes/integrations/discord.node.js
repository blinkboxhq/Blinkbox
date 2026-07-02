/**
 * DISCORD NODE — slim entry. Two transports:
 *   Webhook  — sendMessage / sendEmbed / sendFile (no bot token; resolves the
 *              webhook URL from the credential store or config, forwards inline
 *              attachments) then delegates with no auth.
 *   Bot REST — everything else; resolves the Bot Token credential and delegates
 *              to the modular router in _packaged/discord/. 24 operations.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runDiscord, OPERATIONS, DEFAULT_OPERATION, WEBHOOK_OPS } from "../_packaged/discord/router.js";
import { makeReq } from "../_packaged/discord/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Discord: Unknown operation "${op}".`, skipped: true };

    if (WEBHOOK_OPS.has(op)) {
      let resolvedConfig = { ...config };
      if (config.credentialId && context.getCredential) {
        const cred = await context.getCredential(config.credentialId);
        resolvedConfig.webhookUrl = cred?.token || cred?.url || cred?.webhookUrl || cred?.value || config.webhookUrl;
      }
      if (op === "sendFile" && typeof config.attachmentIndex === "number" && !config._inlineAttachment) {
        const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
        if (att) resolvedConfig = { ...resolvedConfig, _inlineAttachment: att };
      }
      return runDiscord(resolvedConfig, null);
    }

    if (!config.credentialId) {
      return { success: false, error: "Discord: No credential selected — pick a Discord Bot Token credential.", skipped: true };
    }
    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Discord");
    } catch (e) {
      return { success: false, error: `Discord: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runDiscord(config, makeReq(token));
  },
};

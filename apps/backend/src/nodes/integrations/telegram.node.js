/**
 * TELEGRAM NODE — slim entry. Resolves the Bot Token credential, applies the
 * chatId/attachment resolution specific to workflow context, then delegates to
 * the modular router in _packaged/telegram/ (v1/*Description.js). 39 operations.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runTelegram, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/telegram/router.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Telegram: Unknown operation "${operation}".`, skipped: true };

    if (!config.credentialId)
      return { success: false, error: "Telegram: No credential selected — pick a Telegram Bot Token credential.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Telegram");
    } catch (e) {
      return { success: false, error: `Telegram: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const resolvedConfig = { ...config };

    if (!resolvedConfig.chatId) {
      const triggerChat = context.triggerOutput?.chat?.id;
      if (triggerChat) resolvedConfig.chatId = String(triggerChat);
    }

    if (typeof config.attachmentIndex === "number" && !resolvedConfig._inlineAttachment) {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) resolvedConfig._inlineAttachment = att;
    }

    return runTelegram(resolvedConfig, token);
  },
};

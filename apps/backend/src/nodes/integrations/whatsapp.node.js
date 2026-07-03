/**
 * WHATSAPP NODE — slim entry.
 * Resolves the Meta Cloud API access token, then delegates to the modular
 * router in _packaged/whatsapp/ (text, media, interactive, content, template,
 * read-receipts — 13 operations). The router owns the attachment-forwarding
 * upload path so this entry stays thin.
 */
import { run as runWhatsApp, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/whatsapp/router.js";
import { getToken, makeReq } from "../_packaged/whatsapp/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation])
      return { success: false, error: `WhatsApp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId)
      return { success: false, error: "WhatsApp: No credential configured — add your Meta access token to the Vault.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `WhatsApp: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runWhatsApp(config, input, makeReq(token));
  },
};

/**
 * SENDGRID NODE — slim entry.
 * Resolves the SendGrid API key credential, then delegates to the modular
 * router in _packaged/sendgrid/ (mail, contacts, lists, templates,
 * validation/stats/suppressions — 16 operations).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runSendgrid, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/sendgrid/router.js";
import { makeReq } from "../_packaged/sendgrid/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[op])
      return { success: false, error: `SendGrid: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId)
      return { success: false, error: "SendGrid: No credential configured — add your SendGrid API key to the Vault.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "SendGrid");
    } catch (e) {
      return { success: false, error: `SendGrid: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runSendgrid(config, makeReq(token));
  },
};

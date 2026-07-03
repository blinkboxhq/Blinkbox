/**
 * OUTLOOK NODE — slim entry. Resolves the Microsoft 365 OAuth token, builds a
 * Graph client, then delegates to the modular router under _packaged/outlook/.
 * Handlers receive (config, client) where client wraps the Graph v1.0 base URL
 * with get/post/patch/del helpers. Preserves the original node's
 * skip-on-unknown-op / skip-on-missing-credential contract with the original
 * message text.
 *
 * Microsoft Graph API — email, calendar, contacts, folders, drafts.
 * Auth: Microsoft 365 OAuth token stored in the credential vault.
 */
import { run as runOutlook, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/outlook/router.js";
import { getToken, authHeaders, makeClient } from "../_packaged/outlook/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) {
      return { success: false, error: `Outlook: Unknown operation "${operation}".`, skipped: true };
    }

    if (!config.credentialId) {
      return { success: false, error: "Outlook: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Outlook: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = makeClient(authHeaders(token));
    return runOutlook({ ...config, operation, input }, client);
  },
};

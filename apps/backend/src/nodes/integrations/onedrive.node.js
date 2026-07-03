/**
 * ONEDRIVE NODE — slim entry. Resolves the Microsoft 365 OAuth token, then
 * delegates to the modular router under _packaged/onedrive/. Handlers receive
 * (config, ctx) where ctx = { token, headers }. Preserves the original node's
 * skip-on-unknown-op / skip-on-missing-credential contract with the original
 * message text.
 *
 * Microsoft Graph API — files, folders, sharing.
 * Auth: Microsoft 365 OAuth token stored in the credential vault.
 */
import { run as runOneDrive, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/onedrive/router.js";
import { getToken, authHeaders } from "../_packaged/onedrive/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) {
      return { success: false, error: `OneDrive: Unknown operation "${operation}".`, skipped: true };
    }

    if (!config.credentialId) {
      return { success: false, error: "OneDrive: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OneDrive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const ctx = { token, headers: authHeaders(token), input };
    return runOneDrive({ ...config, operation }, ctx);
  },
};

/**
 * DROPBOX NODE — slim entry. Resolves the vaulted Dropbox OAuth token, builds
 * the client (token + JSON headers for the RPC / content hosts), then delegates
 * to the modular router under _packaged/dropbox/. Handlers receive
 * (config, client) where client = { token, headers }. Preserves the original
 * node's skip-on-unknown-op / skip-on-missing-credential contract with the
 * original message text.
 *
 * Auth: Dropbox OAuth token stored in the credential vault.
 */
import { run as runDropbox, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/dropbox/router.js";
import { getToken, authHeaders } from "../_packaged/dropbox/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Dropbox: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Dropbox: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Dropbox: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = { token, headers: authHeaders(token) };
    return runDropbox({ ...config, operation: op }, client);
  },
};

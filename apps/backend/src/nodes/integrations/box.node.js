/**
 * BOX NODE — slim entry. Resolves the vaulted Box OAuth token, builds the client
 * (token + JSON headers), then delegates to the modular router under
 * _packaged/box/. Handlers receive (config, client) where
 * client = { token, headers }. Preserves the original node's
 * skip-on-unknown-op / skip-on-missing-credential contract with the original
 * message text.
 *
 * Auth: Box OAuth token stored in the credential vault.
 */
import { run as runBox, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/box/router.js";
import { getToken, authHeaders } from "../_packaged/box/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Box: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Box: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Box: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = { token, headers: authHeaders(token) };
    return runBox({ ...config, operation: op }, client);
  },
};

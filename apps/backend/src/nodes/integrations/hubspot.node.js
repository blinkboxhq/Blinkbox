/**
 * HUBSPOT NODE — slim entry. Resolves the vaulted HubSpot Private App / OAuth
 * token, builds the axios client, then delegates to the modular router under
 * _packaged/hubspot/. Handlers receive (config, { api }). Preserves the
 * original node's skip-on-unknown-op / skip-on-missing-credential contract with
 * the original message text.
 *
 * Auth: HubSpot Private App access token (pat-...) from the credential vault.
 */
import { run as runHubSpot, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/hubspot/router.js";
import { getToken, makeClient } from "../_packaged/hubspot/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `HubSpot: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "HubSpot: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `HubSpot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = makeClient(token);
    return runHubSpot({ ...config, operation: op }, { api });
  },
};

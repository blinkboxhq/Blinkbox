/**
 * REDDIT NODE — slim entry. Resolves the vaulted app credential, exchanges it
 * for a short-lived app-only bearer token, then delegates to the modular router
 * under _packaged/reddit/. Handlers receive a { headers } client. Preserves the
 * monolith's skip-on-unknown-op / skip-on-missing-credential contract.
 *
 * Auth: Reddit app clientId/clientSecret via getOAuthToken (JSON or raw),
 * exchanged for a client_credentials app-only token.
 */
import { run as runReddit, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/reddit/router.js";
import { resolveCredential, getRedditToken, buildClient } from "../_packaged/reddit/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation]) {
      return { success: false, error: `Reddit: Unknown operation "${operation}".`, skipped: true };
    }

    if (!config.credentialId) {
      return { success: false, error: "Reddit: No credential selected.", skipped: true };
    }

    let clientId, clientSecret;
    try {
      ({ clientId, clientSecret } = await resolveCredential(config.credentialId, context.workspaceId));
    } catch (e) {
      return { success: false, error: `Reddit: Could not resolve credential — ${e.message}`, skipped: true };
    }

    if (!clientId || !clientSecret) {
      return { success: false, error: "Reddit: Credential must contain clientId and clientSecret.", skipped: true };
    }

    let token;
    try {
      token = await getRedditToken(clientId, clientSecret);
    } catch (e) {
      return { success: false, error: e.message, skipped: true };
    }

    return runReddit(config, buildClient(token));
  },
};

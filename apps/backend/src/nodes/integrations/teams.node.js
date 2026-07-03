/**
 * TEAMS NODE — slim entry. Resolves the Microsoft 365 OAuth token, builds a
 * Graph client, then delegates to the modular router under _packaged/teams/.
 * Handlers receive (config, client). Preserves the original node's contract:
 * skip on unknown-operation / missing-credential / cred-resolution failure /
 * per-op validation, with the original message text.
 *
 * Auth: Microsoft 365 OAuth token stored in the credential vault.
 */
import { run as runTeams, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/teams/router.js";
import { getToken, authHeaders, makeClient } from "../_packaged/teams/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation]) {
      return { success: false, error: `Teams: Unknown operation "${operation}".`, skipped: true };
    }

    if (!config.credentialId) {
      return { success: false, error: "Teams: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Teams: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = makeClient(authHeaders(token));
    return runTeams({ ...config, operation, input }, client);
  },
};

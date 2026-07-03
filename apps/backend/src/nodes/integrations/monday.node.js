/**
 * MONDAY.COM NODE — slim entry. Resolves the vaulted API token, builds the
 * GraphQL client, then delegates to the modular router under _packaged/monday/.
 * Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }`.
 *
 * Auth: Monday.com API token in vault. Bearer auth, GraphQL transport.
 */
import { run as runMonday, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/monday/router.js";
import { getToken, buildClient } from "../_packaged/monday/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Monday: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Monday: No credential selected — pick a Monday.com API token credential.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Monday: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = buildClient(token);
    return runMonday(config, client);
  },
};

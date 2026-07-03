/**
 * ASANA NODE — slim entry. Resolves the vaulted access token, builds the
 * client, then delegates to the modular router under _packaged/asana/.
 * Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }`.
 *
 * Auth: Asana personal access token / OAuth token in vault. Bearer auth.
 */
import { run as runAsana, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/asana/router.js";
import { getToken, buildClient } from "../_packaged/asana/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Asana: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Asana: credential required.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Asana: Failed to resolve credential — ${e.message}`, skipped: true };
    }
    if (!token)
      return { success: false, error: "Asana: personal access token is required.", skipped: true };

    const client = buildClient(token);
    return runAsana(config, client);
  },
};

/**
 * PIPEDRIVE NODE — slim entry. Resolves the vaulted API token, builds the
 * query-param axios client, then delegates to the modular router under
 * _packaged/pipedrive/. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }`.
 *
 * Auth: Pipedrive API token — sent as the `api_token` query parameter.
 */
import { run as runPipedrive, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/pipedrive/router.js";
import { getToken, buildClient } from "../_packaged/pipedrive/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Pipedrive: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Pipedrive: No credential selected.", skipped: true };

    let apiToken;
    try {
      apiToken = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Pipedrive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = buildClient(apiToken);
    return runPipedrive(config, client);
  },
};

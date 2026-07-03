/**
 * INTERCOM NODE — slim entry. Resolves the Intercom access token, builds a
 * pinned-version client, then delegates to the modular router under
 * _packaged/intercom/. Handlers receive (config, { api }). Preserves the
 * original node's contract: skip on missing-credential / cred-resolution
 * failure / per-op validation, but THROW on unknown operation (the monolith's
 * switch default threw), with the original message text.
 *
 * Auth: Intercom access token stored in the credential vault.
 */
import { run as runIntercom, DEFAULT_OPERATION, OPERATIONS, resolveOp } from "../_packaged/intercom/router.js";
import { getToken, client } from "../_packaged/intercom/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "Intercom: No credential selected — pick an Intercom Access Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Intercom: Could not resolve credential — ${e.message}`, skipped: true };
    }

    if (!OPERATIONS[resolveOp(operation)]) {
      throw new Error(`Intercom: Unknown operation "${operation}".`);
    }

    const api = client(token);
    return runIntercom({ ...config, operation }, { api, input });
  },
};

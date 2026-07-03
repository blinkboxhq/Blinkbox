/**
 * TRELLO NODE — slim entry. Resolves the vaulted "apiKey:token" (or JSON)
 * credential, builds the query-param auth client, then delegates to the modular
 * router under _packaged/trello/. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }`.
 *
 * Auth: Trello API key + token — stored as "apiKey:token" or JSON
 * {apiKey, token}. Sent as query parameters.
 */
import { run as runTrello, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/trello/router.js";
import { getRawCredential, parseAuth, buildClient } from "../_packaged/trello/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Trello: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Trello: credential required.", skipped: true };

    let raw;
    try {
      raw = await getRawCredential(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Trello: Failed to resolve credential — ${e.message}`, skipped: true };
    }

    const auth = parseAuth(raw);
    if (!auth)
      return { success: false, error: "Trello: both apiKey and token are required.", skipped: true };

    const client = buildClient(auth);
    return runTrello(config, client);
  },
};

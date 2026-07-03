/**
 * CLICKUP NODE — slim entry. Resolves the vaulted API token, builds the client
 * (raw `Authorization: <token>` header — NOT Bearer), then delegates to the
 * modular router under _packaged/clickup/. Normalizes unknown-op /
 * missing-credential to `{ success:false, error, skipped:true }`.
 */
import { run as runClickUp, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/clickup/router.js";
import { getToken, buildClient } from "../_packaged/clickup/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `ClickUp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "ClickUp: API token is required.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `ClickUp: Could not resolve credential — ${e.message}`, skipped: true };
    }
    if (!token)
      return { success: false, error: "ClickUp: API token is required.", skipped: true };

    const client = buildClient(token);
    return runClickUp(config, client);
  },
};

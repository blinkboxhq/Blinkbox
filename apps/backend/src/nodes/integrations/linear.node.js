/**
 * LINEAR NODE — slim entry. Resolves the Linear API key, builds the requester,
 * then delegates to the modular router in _packaged/linear/. Manage issues,
 * projects, cycles, labels and teams via the Linear GraphQL API.
 *
 * Auth: Linear API key stored in vault (lin_api_...).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runLinear, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/linear/router.js";
import { makeReq } from "../_packaged/linear/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `Linear: Unknown operation "${operation}".`, skipped: true };

    if (!config.credentialId) return { success: false, error: "Linear: credential required.", skipped: true };

    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Linear");
    } catch (err) {
      return { success: false, error: `Linear: Failed to resolve credential — ${err.message}`, skipped: true };
    }

    return runLinear(config, makeReq(apiKey));
  },
};

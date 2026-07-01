/**
 * VERCEL NODE — slim entry. Auth resolves here; packaged router runs the op.
 * Vercel REST API: deployments, projects, env vars, domains, DNS, aliases, teams, edge config.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runVercel, OPERATIONS, DEFAULT_OPERATION } from "../../../../../packages/nodes/vercel/backend/router.js";
import { makeApi } from "../../../../../packages/nodes/vercel/backend/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Vercel: Unknown operation "${op}".`, skipped: true };
    if (!config.credentialId) {
      return { success: false, error: "Vercel: No credential selected — pick a Vercel API Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Vercel");
    } catch (e) {
      return { success: false, error: `Vercel: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runVercel(config, { api: makeApi(token, config) });
  },
};

/**
 * NETLIFY NODE — slim entry. Resolves the PAT, builds the axios requester, then
 * delegates to the modular router in _packaged/netlify/. 37 operation keys
 * (35 unique; triggerDeploy & updateEnvVar are aliases).
 *
 * Auth: Netlify Personal Access Token (Bearer) from credential vault.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runNetlify, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/netlify/router.js";
import { makeReq } from "../_packaged/netlify/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Netlify: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Netlify: No credential selected — pick a Netlify Personal Access Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Netlify");
    } catch (e) {
      return { success: false, error: `Netlify: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runNetlify(config, makeReq(token));
  },
};

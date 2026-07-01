/**
 * AZURE DEVOPS NODE — slim entry. Resolves the PAT, builds the axios-backed
 * requester context, then delegates to the modular router in
 * _packaged/azure_devops/. 31 operations across 6 resources.
 *
 * Auth: Personal Access Token (PAT). Sent as HTTP Basic with an empty
 * username (":PAT" base64-encoded), per Azure DevOps convention.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runAzureDevops, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/azure_devops/router.js";
import { makeReq, skip } from "../_packaged/azure_devops/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    const handler = OPERATIONS[operation];
    if (!handler) return skip(operation, "unknown operation");
    if (!config.organization) return skip(operation, "'organization' is required");
    if (!config.credentialId) return { success: false, error: "Azure DevOps: credential required.", skipped: true };

    let pat;
    try {
      pat = await getOAuthToken(config.credentialId, context.workspaceId, "Azure DevOps");
    } catch (err) {
      return { success: false, error: `Azure DevOps: Failed to resolve credential — ${err.message}`, skipped: true };
    }

    return runAzureDevops(config, makeReq(pat, config));
  },
};

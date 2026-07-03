/**
 * LINKEDIN NODE — slim entry. Resolves the vaulted LinkedIn OAuth2 token, then
 * delegates to the modular router under _packaged/linkedin/. Handlers receive
 * the raw bearer token. Preserves the original node's throw-on-unknown-op /
 * throw-on-missing-credential contract; credential-resolution failures funnel
 * through handleError.
 *
 * Auth: LinkedIn OAuth2 token stored in vault via getOAuthToken.
 */
import { run as runLinkedIn, DEFAULT_OPERATION, OPERATIONS } from "../_packaged/linkedin/router.js";
import { getToken, handleError } from "../_packaged/linkedin/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      throw new Error(`LinkedIn: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("LinkedIn: No credential configured — link a LinkedIn OAuth connection first.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    return runLinkedIn({ ...config, operation }, token);
  },
};

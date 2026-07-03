/**
 * INSTAGRAM NODE — slim entry. Resolves the vaulted OAuth token, then delegates
 * to the modular router under _packaged/instagram/. Handlers receive the raw
 * access token. Preserves the original node's throw-on-unknown-op /
 * throw-on-missing-credential contract.
 *
 * Auth: Instagram OAuth token via getOAuthToken (auto-refreshes).
 */
import { run as runInstagram, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/instagram/router.js";
import { getToken, handleError } from "../_packaged/instagram/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      throw new Error(`Instagram: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("Instagram: No credential configured — link an Instagram OAuth connection first.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    return runInstagram(config, token);
  },
};

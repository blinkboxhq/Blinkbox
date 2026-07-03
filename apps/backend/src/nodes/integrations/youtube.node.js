/**
 * YOUTUBE NODE — slim entry. Resolves the vaulted Google OAuth2 token, then
 * delegates to the modular router under _packaged/youtube/. Handlers receive
 * the raw access token. Preserves the original node's throw-on-unknown-op /
 * throw-on-missing-credential contract.
 *
 * Auth: Google OAuth2 token via getOAuthToken (auto-refreshes).
 */
import { run as runYouTube, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/youtube/router.js";
import { getToken, handleError } from "../_packaged/youtube/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      throw new Error(`YouTube: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("YouTube: No credential configured — link a Google OAuth connection first.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    return runYouTube(config, token);
  },
};

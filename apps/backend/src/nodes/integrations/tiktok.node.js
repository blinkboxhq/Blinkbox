/**
 * TIKTOK NODE — slim entry. Resolves the vaulted OAuth2 token, then delegates
 * to the modular router under _packaged/tiktok/. Handlers receive the raw
 * access token. Preserves the original node's throw-on-unknown-op /
 * throw-on-missing-credential contract.
 *
 * Auth: TikTok OAuth2 token via getOAuthToken (auto-refreshes).
 */
import { run as runTikTok, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/tiktok/router.js";
import { getToken, handleError } from "../_packaged/tiktok/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      throw new Error(`TikTok: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("TikTok: No credential configured — link a TikTok OAuth connection first.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    return runTikTok(config, token);
  },
};

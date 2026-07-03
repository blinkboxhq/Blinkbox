/**
 * TWITTER / X NODE — slim entry. Resolves the vaulted token (Bearer or OAuth2
 * user token), builds the auth-header client, then delegates to the modular
 * router under _packaged/twitter/. Normalizes unknown-op / missing-credential
 * to `{ success:false, error, skipped:true }`.
 *
 * Auth: Bearer token (read-only) OR OAuth 2.0 user token (read+write). Writes
 * (post, like, follow, retweet) require an OAuth2 user-context token.
 */
import { run as runTwitter, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/twitter/router.js";
import { getToken, buildClient } from "../_packaged/twitter/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Twitter: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Twitter: No credential selected.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Twitter: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = buildClient(token);
    return runTwitter(config, client);
  },
};

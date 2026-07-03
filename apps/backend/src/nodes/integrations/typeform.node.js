/**
 * TYPEFORM NODE — slim entry. Resolves the personal-access-token credential,
 * then delegates to the modular router under _packaged/typeform/. Preserves the
 * original node's contract EXACTLY: skips on no-credential, credential-resolve
 * failure and empty token; the router THROWS on an unknown operation (original
 * double-quoted message) and per-op validation returns skip objects.
 * Handlers receive (config, client).
 */
import { run as runTypeform, DEFAULT_OPERATION } from "../_packaged/typeform/router.js";
import { getToken, makeClient } from "../_packaged/typeform/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) return { success: false, error: "Typeform: No credential selected.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Typeform: Could not resolve credential — ${e.message}`, skipped: true };
    }
    if (!token) return { success: false, error: "Typeform: personal access token is required.", skipped: true };

    return runTypeform({ ...config, operation, input }, makeClient(token));
  },
};

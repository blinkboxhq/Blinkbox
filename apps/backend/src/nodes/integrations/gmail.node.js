/**
 * GMAIL NODE — slim entry. Resolves the Google OAuth2 token, then delegates to
 * the modular router in _packaged/gmail/. 24 operations: send/reply/forward,
 * read/search, drafts, read-state, star, archive, trash/untrash, labels,
 * threads, getProfile.
 *
 * Auth: Google OAuth2 credential
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runGmail, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/gmail/router.js";
import { makeReq } from "../_packaged/gmail/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Gmail: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Gmail: No credential selected — pick a Google OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Gmail");
    } catch (e) {
      return { success: false, error: `Gmail: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runGmail(config, makeReq(token));
  },
};

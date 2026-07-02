/**
 * GOOGLE DRIVE NODE — slim entry.
 * Resolves the Google OAuth2 credential, then delegates to the modular router
 * in _packaged/googleDrive/ (files, permissions, drives — 23 operations).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runGoogleDrive, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/googleDrive/router.js";
import { makeReq } from "../_packaged/googleDrive/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) return { success: false, error: "Google Drive: No credential selected.", skipped: true };

    if (!OPERATIONS[op]) return { success: false, error: `Google Drive: Unknown operation "${op}".`, skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Google Drive");
    } catch (e) {
      return { success: false, error: `Google Drive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runGoogleDrive(config, makeReq(token), context);
  },
};

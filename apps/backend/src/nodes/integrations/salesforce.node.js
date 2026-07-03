/**
 * SALESFORCE NODE — slim entry. Resolves the OAuth accessToken + instanceUrl
 * credential, builds an authed client bound to the instance's REST base, then
 * delegates to the modular router under _packaged/salesforce/. Handlers receive
 * (config, client). Preserves the original node's contract: skip on
 * missing-credential / cred-resolution failure / per-op validation, but THROW
 * on unknown operation (the monolith's switch default threw), with the
 * original message text.
 *
 * Auth: OAuth token stored in vault as JSON {"accessToken":"...","instanceUrl":"..."}
 *       OR a plain access token (falls back to config.instanceUrl).
 */
import { run as runSalesforce, DEFAULT_OPERATION } from "../_packaged/salesforce/router.js";
import { getCredentials, makeClient } from "../_packaged/salesforce/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "Salesforce: No credential selected.", skipped: true };
    }

    let credentials;
    try {
      credentials = await getCredentials(config.credentialId, context.workspaceId, config.instanceUrl);
    } catch (e) {
      return { success: false, error: `Salesforce: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = makeClient(credentials.accessToken, credentials.instanceUrl);
    return runSalesforce({ ...config, operation, input }, client);
  },
};

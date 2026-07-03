/**
 * PAYPAL NODE — slim entry. Resolves the clientId/clientSecret credential,
 * exchanges it for a client-credentials access token, builds an authed client,
 * then delegates to the modular router under _packaged/paypal/. Handlers
 * receive (config, client). Preserves the original node's contract: skip on
 * missing-credential / cred-resolution failure / token-exchange failure /
 * per-op validation, but THROW on unknown operation (the monolith's switch
 * default threw), with the original message text.
 *
 * Auth: credential stored in vault as JSON {"clientId":"...","clientSecret":"..."}.
 */
import { run as runPayPal, DEFAULT_OPERATION } from "../_packaged/paypal/router.js";
import { getCredentials, getAccessToken, makeClient } from "../_packaged/paypal/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "PayPal: No credential selected.", skipped: true };
    }

    let credentials;
    try {
      credentials = await getCredentials(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `PayPal: Could not resolve credential — ${e.message}`, skipped: true };
    }

    let accessToken;
    try {
      accessToken = await getAccessToken(credentials.clientId, credentials.clientSecret);
    } catch (e) {
      return { success: false, error: `PayPal: OAuth token exchange failed — ${e.message}`, skipped: true };
    }

    const client = makeClient(accessToken);
    return runPayPal({ ...config, operation, input }, client);
  },
};

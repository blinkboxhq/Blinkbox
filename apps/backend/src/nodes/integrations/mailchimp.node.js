/**
 * MAILCHIMP NODE — slim entry. Resolves the vaulted API key, builds the
 * data-center-aware client, then delegates to the modular router under
 * _packaged/mailchimp/. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }`.
 *
 * Auth: Mailchimp API key in vault (format: key-dcXX). Basic Auth
 * (anystring:apikey), NOT Bearer — the client builder handles it.
 */
import { run as runMailchimp, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/mailchimp/router.js";
import { getApiKey, buildClient } from "../_packaged/mailchimp/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Mailchimp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId)
      return { success: false, error: "Mailchimp: No credential selected — pick a Mailchimp API key credential.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Mailchimp: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const client = buildClient(apiKey);
    return runMailchimp(config, client);
  },
};

/**
 * RESEND NODE — slim entry. Resolves the API-key credential, then delegates to
 * the modular router under _packaged/resend/. Preserves the original node's
 * contract EXACTLY: the unknown-operation THROW happens FIRST (listing valid
 * ops), THEN the no-credential skip, THEN credential-resolve-failure skip; per-op
 * validation returns skip objects. Handlers receive (config, apiKey).
 */
import { run as runResend, DEFAULT_OPERATION, OPERATIONS, unknownOperationError } from "../_packaged/resend/router.js";
import { getApiKey } from "../_packaged/resend/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) throw unknownOperationError(operation);

    if (!config.credentialId) {
      return { success: false, error: "Resend: No credential selected — pick a Resend API key credential.", skipped: true };
    }

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Resend: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runResend({ ...config, operation, input }, apiKey);
  },
};

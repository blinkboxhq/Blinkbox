/**
 * PINECONE NODE — slim entry. Resolves the API-key credential, then delegates to
 * the modular router under _packaged/pinecone/. Handlers receive (config, apiKey).
 * Preserves the original node's contract EXACTLY: the unknown-operation THROW
 * happens FIRST (before the missing-credential check, as the monolith did),
 * listing the valid ops; then skip on missing-credential / cred-resolution
 * failure / per-op validation.
 */
import { run as runPinecone, DEFAULT_OPERATION, OPERATIONS, unknownOperationError } from "../_packaged/pinecone/router.js";
import { getApiKey } from "../_packaged/pinecone/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) throw unknownOperationError(operation);

    if (!config.credentialId) {
      return { success: false, error: "Pinecone: No credential selected — pick a Pinecone API key credential.", skipped: true };
    }

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Pinecone: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runPinecone({ ...config, operation, input }, apiKey);
  },
};

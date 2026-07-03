/**
 * ELEVENLABS NODE — slim entry. Resolves the API-key credential, then delegates
 * to the modular router under _packaged/elevenlabs/. Preserves the original
 * node's contract EXACTLY: the no-credential skip happens FIRST, THEN the
 * unknown-operation THROW (listing valid ops), THEN credential-resolve-failure
 * skip; per-op validation returns skip objects. All handlers use the
 * (config, apiKey) signature. Handlers receive (config, apiKey).
 */
import { run as runElevenLabs, DEFAULT_OPERATION, OPERATIONS, unknownOperationError } from "../_packaged/elevenlabs/router.js";
import { getApiKey } from "../_packaged/elevenlabs/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const { credentialId } = config;

    if (!credentialId) return { success: false, error: "ElevenLabs: No credential selected.", skipped: true };

    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) throw unknownOperationError(operation);

    let apiKey;
    try {
      apiKey = await getApiKey(credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `ElevenLabs: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runElevenLabs({ ...config, operation, input }, apiKey);
  },
};

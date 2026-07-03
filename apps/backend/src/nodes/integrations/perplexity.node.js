/**
 * PERPLEXITY NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/perplexity/.
 */
import { run as runPerplexity, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/perplexity/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/perplexity/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Perplexity: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Perplexity: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Perplexity: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runPerplexity(config, input, makeReq(apiKey));
  },
};

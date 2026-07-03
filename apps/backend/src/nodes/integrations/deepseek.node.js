/**
 * DEEPSEEK NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/deepseek/.
 *
 * OpenAI-SDK compatible at https://api.deepseek.com — DeepSeek's public API is
 * text-only (no vision / image-gen / audio / embeddings), so this node
 * deliberately exposes only text operations.
 */
import { run as runDeepSeek, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/deepseek/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/deepseek/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `DeepSeek: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "DeepSeek: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `DeepSeek: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runDeepSeek(config, input, makeReq(apiKey));
  },
};

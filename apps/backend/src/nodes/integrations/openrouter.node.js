/**
 * OPENROUTER NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/openrouter/.
 *
 * Unified gateway to 300+ models from every major lab behind a single key.
 * OpenAI-SDK compatible at https://openrouter.ai/api/v1 — model ids use the
 * "vendor/model" form (e.g. "deepseek/deepseek-v4-pro", "anthropic/claude-opus-4-8").
 */
import { run as runOpenRouter, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/openrouter/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/openrouter/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `OpenRouter: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "OpenRouter: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OpenRouter: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runOpenRouter(config, input, makeReq(apiKey));
  },
};

/**
 * XAI (GROK) NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/xai/.
 */
import { run as runXai, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/xai/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/xai/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `xAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "xAI: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `xAI: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runXai(config, input, makeReq(apiKey));
  },
};

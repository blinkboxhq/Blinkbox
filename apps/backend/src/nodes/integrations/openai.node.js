/**
 * OPENAI NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/openai/.
 */
import { run as runOpenAI, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/openai/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/openai/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `OpenAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "OpenAI: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OpenAI: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runOpenAI(config, input, makeReq(apiKey));
  },
};

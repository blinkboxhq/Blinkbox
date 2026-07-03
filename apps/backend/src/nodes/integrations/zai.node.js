/**
 * Z.AI (GLM) NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/zai/.
 *
 * Z.ai's GLM family — flagship reasoning/coding/agentic models from the lab
 * formerly known as Zhipu AI. OpenAI-SDK compatible at
 * https://api.z.ai/api/paas/v4 — GLM-5.2 flagship (1M context), GLM-4.7,
 * GLM-4.5-Air (low-cost), GLM-4.6V (vision + native tool-calling).
 */
import { run as runZai, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/zai/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/zai/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Z.ai: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Z.ai: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Z.ai: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runZai(config, input, makeReq(apiKey));
  },
};

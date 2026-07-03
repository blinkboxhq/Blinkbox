/**
 * SAKANA FUGU NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/sakana/.
 *
 * Sakana AI's Fugu — a "multi-agent system as a model": one model trained to
 * call other models, deciding per request whether to answer alone or orchestrate
 * a team. OpenAI-SDK compatible at https://api.sakana.ai/v1.
 */
import { run as runSakana, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/sakana/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/sakana/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Sakana: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Sakana: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Sakana: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runSakana(config, input, makeReq(apiKey));
  },
};

/**
 * MINIMAX NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/minimax/.
 *
 * OpenAI-SDK compatible at https://api.minimax.io/v1 — MiniMax-M3 family:
 * flagship reasoning + 1M-token context, thinking mode, agentic tool calling,
 * multimodal (text + image) input.
 */
import { run as runMiniMax, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/minimax/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/minimax/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `MiniMax: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "MiniMax: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `MiniMax: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runMiniMax(config, input, makeReq(apiKey));
  },
};

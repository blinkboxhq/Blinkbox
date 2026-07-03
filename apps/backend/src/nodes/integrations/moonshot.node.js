/**
 * MOONSHOT (KIMI) NODE — slim entry. Normalizes unknown-op / missing-credential
 * to `{ success:false, error, skipped:true }` (keeping the monolith's message
 * text), then delegates to the modular router under _packaged/moonshot/.
 *
 * OpenAI-SDK compatible at https://api.moonshot.ai/v1 — Kimi K2.x family:
 * flagship multimodal (text + image + video in), thinking mode, agentic tool
 * calling, very long context.
 */
import { run as runMoonshot, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/moonshot/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/moonshot/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `Moonshot: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Moonshot: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Moonshot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runMoonshot(config, input, makeReq(apiKey));
  },
};

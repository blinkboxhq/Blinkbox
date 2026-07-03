/**
 * NVIDIA NIM NODE — slim entry. Normalizes unknown-op / missing-credential to
 * `{ success:false, error, skipped:true }` (keeping the monolith's message text),
 * then delegates to the modular router under _packaged/nvidiaNim/.
 *
 * Multi-operation node for NVIDIA NIM (NVIDIA Inference Microservices).
 * OpenAI-SDK compatible at https://integrate.api.nvidia.com/v1 — one catalog
 * fronting Nemotron, Llama, DeepSeek, Qwen, Mistral, Kimi, vision VLMs and
 * embedding models. Switching models is one string change.
 */
import { run as runNvidiaNim, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/nvidiaNim/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/nvidiaNim/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation])
      return { success: false, error: `NVIDIA NIM: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
    if (!config.credentialId) return { success: false, error: "NVIDIA NIM: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `NVIDIA NIM: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runNvidiaNim(config, input, makeReq(apiKey));
  },
};

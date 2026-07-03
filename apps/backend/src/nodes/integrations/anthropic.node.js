/**
 * ANTHROPIC NODE — slim entry.
 *
 * Multi-operation Anthropic Claude "subject" node — one node, 21 operations,
 * all driven by the Messages API. Resolves the Anthropic API key from the
 * Vault, then delegates to the modular router in _packaged/anthropic/
 * (chat, vision, text-utility). Re-exports `listModels` for the "fetch latest
 * models" button (consumed by automation.routes.js → MODEL_PROVIDERS).
 *
 * OPERATIONS: message, multiTurn, structuredOutput, functionCalling,
 *   extendedThinking, analyzeImage, analyzeDocument, analyzePdf, citations,
 *   extractData, classify, summarize, translate, sentiment, moderateContent,
 *   codeReview, generatePrompt, improvePrompt, promptCaching, countTokens,
 *   listModels.
 *
 * Output varies by operation — see each handler in v1/.
 */
import { run as runAnthropic, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/anthropic/router.js";
import { getApiKey, makeReq, listModels } from "../_packaged/anthropic/GenericFunctions.js";

export { listModels };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation])
      return { success: false, error: `Anthropic: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId) return { success: false, error: "Anthropic: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Anthropic: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runAnthropic(config, input, makeReq(apiKey));
  },
};

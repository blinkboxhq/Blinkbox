/**
 * MiniMax — vision operation: analyzeImage (MiniMax-M3 multimodal).
 * Handler receives `(config, input, apiKey)`. Body moved verbatim from the monolith.
 */
import { DEFAULT_VISION_MODEL, chat } from "../GenericFunctions.js";

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL } = config;
  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  const question = config.question || config.prompt || "Describe this image in detail.";
  if (!imageUrl) return { success: false, error: "MiniMax analyzeImage: 'imageUrl' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "user", content: [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: imageUrl, ...(config.detail ? { detail: config.detail } : {}) } },
      ]},
    ],
    max_tokens: Number(config.maxTokens || 1024),
    ...(config.temperature !== undefined && config.temperature !== "" ? { temperature: Number(config.temperature) } : {}),
  }, 120000);

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "minimax", operation: "analyzeImage" };
}

export const visionOperations = {
  analyzeImage: opAnalyzeImage,
};

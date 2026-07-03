/**
 * xAI (Grok) — image operations: analyzeImage (vision), generateImage (grok-2-image).
 * Handlers receive `(config, input, apiKey)`. Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import {
  BASE,
  DEFAULT_VISION_MODEL,
  DEFAULT_IMAGE_MODEL,
  resolveInlineRef,
  samplingParams,
  authHeaders,
  chat,
} from "../GenericFunctions.js";

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL, prompt = "Describe this image in detail.", detail = "auto" } = config;
  const ref = config.imageUrl || config.fileInput || input?.imageUrl || input?.url || input?.dataUri;
  const url = await resolveInlineRef(ref, "imageUrl");

  const data = await chat(apiKey, {
    model,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url, detail } },
      ],
    }],
    ...samplingParams({ maxTokens: config.maxTokens ?? 1000, ...config }),
  });

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const { model = DEFAULT_IMAGE_MODEL, imagePrompt, prompt, n = 1 } = config;
  const description = imagePrompt || prompt || input?.prompt || input?.description;
  if (!description) return { success: false, error: "xAI generateImage: 'imagePrompt' is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/images/generations`,
    {
      model,
      prompt: description,
      n: Math.min(Math.max(parseInt(n) || 1, 1), 10),
      response_format: "b64_json",
    },
    { headers: authHeaders(apiKey), timeout: 180000 },
  );

  const data = response.data.data || [];
  const files = data.map((d, i) => ({
    filename: `xai-image-${Date.now()}-${i}.jpg`,
    contentType: "image/jpeg",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/jpeg;base64,${d.b64_json}` : undefined,
    url: d.url,
    revisedPrompt: d.revised_prompt,
  }));
  const first = files[0];

  return {
    filename: first?.filename,
    contentType: "image/jpeg",
    base64: first?.base64,
    dataUri: first?.dataUri || first?.url,
    imageUrl: first?.url,
    revisedPrompt: data[0]?.revised_prompt,
    files,
    model,
    provider: "xai",
    operation: "generateImage",
  };
}

export const imageOperations = {
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
};

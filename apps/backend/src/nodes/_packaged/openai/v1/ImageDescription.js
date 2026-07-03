/**
 * OpenAI — image operations: analyzeImage, generateImage, editImage,
 * imageVariation. Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import {
  BASE, DEFAULT_CHAT_MODEL,
  samplingParams, resolveInlineRef, resolveFileToBuffer,
} from "../GenericFunctions.js";

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt = "Describe this image in detail.", detail = "auto" } = config;
  const ref = config.imageUrl || config.fileInput || input?.imageUrl || input?.url || input?.dataUri;
  const url = await resolveInlineRef(ref, "imageUrl");

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url, detail } },
        ],
      }],
      ...samplingParams({ maxTokens: config.maxTokens ?? 1000, ...config }),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const {
    model = "gpt-image-2",
    imagePrompt,
    prompt,
    imageSize = "1024x1024",
    imageQuality = "high",
    n = 1,
  } = config;

  const description = imagePrompt || prompt || input?.prompt || input?.description;
  if (!description) return { success: false, error: "OpenAI generateImage: 'imagePrompt' is required.", skipped: true };

  const body = { model, prompt: description, n: Math.min(Math.max(parseInt(n) || 1, 1), 10), size: imageSize };
  // gpt-image-* returns b64 by default and accepts quality high/medium/low;
  // dall-e-3 wants standard/hd + an explicit response_format.
  if (/^dall-e/.test(model)) {
    body.quality = imageQuality === "high" ? "hd" : "standard";
    body.response_format = "b64_json";
  } else {
    body.quality = ["high", "medium", "low"].includes(imageQuality) ? imageQuality : "high";
    if (config.background) body.background = config.background;
  }

  const response = await axios.post(`${BASE}/images/generations`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 180000,
  });

  const first = response.data.data?.[0];
  const b64 = first?.b64_json;
  const files = (response.data.data || []).map((d, i) => ({
    filename: `openai-image-${Date.now()}-${i}.png`,
    contentType: "image/png",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/png;base64,${d.b64_json}` : undefined,
    url: d.url,
    revisedPrompt: d.revised_prompt,
  }));

  return {
    filename: files[0]?.filename,
    contentType: "image/png",
    base64: b64,
    dataUri: b64 ? `data:image/png;base64,${b64}` : first?.url,
    imageUrl: first?.url,
    revisedPrompt: first?.revised_prompt,
    files,
    model,
    provider: "openai",
    operation: "generateImage",
  };
}

async function opEditImage(config, input, apiKey) {
  const { model = "gpt-image-2", imagePrompt, prompt, imageSize = "1024x1024" } = config;
  const description = imagePrompt || prompt;
  if (!description) return { success: false, error: "OpenAI editImage: 'imagePrompt' is required.", skipped: true };

  const sourceRef = config.fileInput || config.imageUrl || input?.dataUri || input?.imageUrl || input?.url || input?.base64;
  const imageBuffer = await resolveFileToBuffer(sourceRef, { label: "source image" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", description);
  form.append("size", imageSize);
  form.append("image", imageBuffer, { filename: "source.png", contentType: "image/png" });
  if (config.maskInput) {
    const maskBuffer = await resolveFileToBuffer(config.maskInput, { label: "mask" });
    form.append("mask", maskBuffer, { filename: "mask.png", contentType: "image/png" });
  }

  const response = await axios.post(`${BASE}/images/edits`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  const first = response.data.data?.[0];
  const b64 = first?.b64_json;
  return {
    filename: `openai-edit-${Date.now()}.png`,
    contentType: "image/png",
    base64: b64,
    dataUri: b64 ? `data:image/png;base64,${b64}` : first?.url,
    imageUrl: first?.url,
    model,
    provider: "openai",
    operation: "editImage",
  };
}

async function opImageVariation(config, input, apiKey) {
  const sourceRef = config.fileInput || config.imageUrl || input?.dataUri || input?.imageUrl || input?.url || input?.base64;
  const imageBuffer = await resolveFileToBuffer(sourceRef, { label: "source image" });
  const n = Math.min(Math.max(parseInt(config.n, 10) || 1, 1), 10);
  const size = config.imageSize || "1024x1024";

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("image", imageBuffer, { filename: "source.png", contentType: "image/png" });
  form.append("n", String(n));
  form.append("size", size);

  const response = await axios.post(`${BASE}/images/variations`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  const images = (response.data.data || []).map((d, i) => ({
    filename: `openai-variation-${Date.now()}-${i}.png`,
    contentType: "image/png",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url,
    imageUrl: d.url,
  }));
  return { images, count: images.length, ...images[0], provider: "openai", operation: "imageVariation" };
}

export const imageOperations = {
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  editImage: opEditImage,
  imageVariation: opImageVariation,
};

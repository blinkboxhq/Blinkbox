/**
 * Gemini — multimodal operations: analyzeImage, generateImage, analyzePdf,
 * analyzeAudio, analyzeVideo. Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import { generationConfig, resolveInlinePart, callGemini } from "../GenericFunctions.js";

async function opAnalyzeImage(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Describe this image in detail." } = config;
  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  if (!imageUrl) return { success: false, error: "Gemini analyzeImage: 'imageUrl' is required.", skipped: true };

  const part = await resolveInlinePart(imageUrl, { fallbackMime: "image/jpeg", label: "image" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a helpful vision assistant. Analyze images thoroughly and answer accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.5, maxTokens: 1500 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const { model = "gemini-3.1-flash-image" } = config;
  const imagePrompt = config.imagePrompt || config.prompt || input?.prompt;
  if (!imagePrompt) return { success: false, error: "Gemini generateImage: 'imagePrompt' is required.", skipped: true };

  const parts = [{ text: imagePrompt }];
  if (config.fileInput) parts.unshift(await resolveInlinePart(config.fileInput, { fallbackMime: "image/png", label: "source image" }));

  const { images, text, tokensUsed } = await callGemini(apiKey, model, { parts });
  if (!images.length) return { success: false, error: `Gemini generateImage: model returned no image${text ? ` — ${text}` : ""}.`, skipped: true };

  return {
    images, image: images[0], dataUri: images[0].dataUri, count: images.length,
    text: text || undefined, model, tokensUsed, provider: "gemini", operation: "generateImage",
  };
}

async function opAnalyzePdf(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Summarize this PDF." } = config;
  const fileRef = config.fileInput || input?.fileUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzePdf: a PDF 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "application/pdf", label: "PDF" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a document analysis assistant. Read the PDF and answer accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.3, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzePdf" };
}

async function opAnalyzeAudio(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Transcribe this audio." } = config;
  const fileRef = config.fileInput || config.audioUrl || input?.audioUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzeAudio: an audio 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "audio/mp3", label: "audio" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are an audio understanding assistant. Transcribe and analyze audio accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.2, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeAudio" };
}

async function opAnalyzeVideo(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Describe what happens in this video." } = config;
  const fileRef = config.fileInput || config.videoUrl || input?.videoUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzeVideo: a video 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "video/mp4", label: "video", maxBytes: 25 * 1024 * 1024 });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a video understanding assistant. Describe and analyze video content accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.4, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeVideo" };
}

export const mediaOperations = {
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  analyzePdf: opAnalyzePdf,
  analyzeAudio: opAnalyzeAudio,
  analyzeVideo: opAnalyzeVideo,
};

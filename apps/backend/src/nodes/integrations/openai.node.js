/**
 * OPENAI NODE
 *
 * Multi-operation OpenAI node.
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — model id (default per operation)
 *   prompt       — instruction / user message (most operations)
 *   credentialId — Vault reference to OpenAI API key
 *   outputFormat — "json" | "text" (default: "text") — message op only
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — max response tokens (default: 2000)
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL or base64 data URI of the image
 *
 *   ── generateImage ──
 *   imagePrompt  — text description of the image to generate
 *   imageSize    — "1024x1024" | "1792x1024" | "1024x1792" (default: "1024x1024")
 *   imageQuality — "standard" | "hd" (default: "standard")
 *
 *   ── transcribeAudio ──
 *   audioUrl     — publicly accessible URL to .mp3/.mp4/.m4a/.wav/.webm
 *   language     — ISO-639-1 language code (optional, e.g. "en")
 *
 *   ── moderateContent ──
 *   (uses prompt as the text to moderate)
 *
 * OPERATIONS:
 *   message          — Chat completion (GPT-4o, GPT-4o-mini, etc.)
 *   analyzeImage     — Vision: describe or answer questions about an image
 *   generateImage    — DALL-E 3: generate an image from text
 *   transcribeAudio  — Whisper: transcribe audio to text
 *   analyzeDocument  — Send document text as context + ask a question
 *   moderateContent  — Run text through the Moderation API
 *   generatePrompt   — Ask GPT to write a prompt for a given task
 *   improvePrompt    — Ask GPT to improve/rewrite an existing prompt
 *
 * Output varies by operation — see each handler below.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.openai.com/v1";

async function getApiKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "OpenAI");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err, provider = "OpenAI") {
  if (err.response?.status === 401) throw new Error(`${provider}: Invalid API key.`);
  if (err.response?.status === 429) throw new Error(`${provider}: Rate limit exceeded. Retry later.`);
  if (err.response?.status === 400) throw new Error(`${provider}: Bad request — ${err.response?.data?.error?.message || err.message}`);
  throw new Error(`${provider} failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const {
    model = "gpt-4o-mini",
    prompt,
    outputFormat = "text",
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  if (!prompt) return { success: false, error: "OpenAI message: 'prompt' is required., skipped: true };

  const systemMessage =
    outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.";

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const choice = response.data.choices?.[0];
  let result = choice?.message?.content || "";

  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "message" };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = "gpt-4o", prompt = "Describe this image in detail.", imageUrl } = config;
  const url = imageUrl || input?.imageUrl || input?.url;
  if (!url) return { success: false, error: "OpenAI analyzeImage: 'imageUrl' is required., skipped: true };
  if (!url.startsWith("data:") && !/^https?:\/\//i.test(url)) {
    throw new Error("OpenAI analyzeImage: imageUrl must be an http/https URL or base64 data URI.");
  }

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url, detail: "auto" } },
        ],
      }],
      max_tokens: config.maxTokens || 1000,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const {
    model = "dall-e-3",
    imagePrompt,
    prompt,
    imageSize = "1024x1024",
    imageQuality = "standard",
  } = config;

  const description = imagePrompt || prompt || input?.prompt || input?.description;
  if (!description) return { success: false, error: "OpenAI generateImage: 'imagePrompt' is required., skipped: true };

  const response = await axios.post(
    `${BASE}/images/generations`,
    { model, prompt: description, n: 1, size: imageSize, quality: imageQuality, response_format: "url" },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const imageData = response.data.data?.[0];
  return {
    imageUrl: imageData?.url,
    revisedPrompt: imageData?.revised_prompt,
    model,
    provider: "openai",
    operation: "generateImage",
  };
}

async function opTranscribeAudio(config, input, apiKey) {
  const { audioUrl, language } = config;
  const url = audioUrl || input?.audioUrl || input?.url;
  if (!url) return { success: false, error: "OpenAI transcribeAudio: 'audioUrl' is required., skipped: true };

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("OpenAI transcribeAudio: audioUrl must be an http/https URL.");
  }
  // Download the audio file and send as multipart (25 MB = Whisper's hard limit)
  const audioResponse = await axios.get(url, { responseType: "arraybuffer", timeout: 60000, maxContentLength: 25 * 1024 * 1024 });
  const audioBuffer = Buffer.from(audioResponse.data);

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", "whisper-1");
  if (language) form.append("language", language);
  form.append("response_format", "json");

  const response = await axios.post(`${BASE}/audio/transcriptions`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  return {
    transcript: response.data.text || "",
    language: response.data.language || language || "auto",
    provider: "openai",
    operation: "transcribeAudio",
  };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "gpt-4o-mini", prompt = "Summarize this document.", maxTokens = 4000 } = config;

  const documentText =
    config.documentText ||
    input?.text ||
    input?.content ||
    input?.body ||
    inputSummary(input);

  if (!documentText) throw new Error("OpenAI analyzeDocument: provide 'documentText' or pass document text as input.");

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are a document analysis assistant. Analyze the provided document thoroughly and answer questions about it." },
        { role: "user", content: `${prompt}\n\n---\nDocument:\n${documentText.substring(0, 30000)}` },
      ],
      max_tokens: maxTokens,
      temperature: config.temperature ?? 0.3,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "analyzeDocument" };
}

async function opModerateContent(config, input, apiKey) {
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "OpenAI moderateContent: text to moderate is required., skipped: true };

  const response = await axios.post(
    `${BASE}/moderations`,
    { input: text.substring(0, 10000), model: "omni-moderation-latest" },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
  );

  const result = response.data.results?.[0];
  return {
    flagged: result?.flagged || false,
    categories: result?.categories || {},
    scores: result?.category_scores || {},
    provider: "openai",
    operation: "moderateContent",
  };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "gpt-4o-mini", task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "OpenAI generatePrompt: 'task' description is required., skipped: true };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
        { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { prompt: result, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = "gpt-4o-mini" } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "OpenAI improvePrompt: 'prompt' to improve is required., skipped: true };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
        { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { improvedPrompt: result, originalPrompt, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "improvePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  transcribeAudio: opTranscribeAudio,
  analyzeDocument: opAnalyzeDocument,
  moderateContent: opModerateContent,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`OpenAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const apiKey = await getApiKey(config.credentialId, context.workspaceId);

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      if (err.message.startsWith("OpenAI")) throw err; // already classified
      handleError(err, "OpenAI");
    }
  },
};

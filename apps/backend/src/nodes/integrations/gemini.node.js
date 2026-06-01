/**
 * GEMINI NODE
 *
 * Multi-operation Google Gemini node via the Generative Language API.
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — model id (default per operation)
 *   prompt       — instruction / user message
 *   credentialId — Vault reference to Google AI API key
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — max output tokens (default: 2000)
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL to an image (JPEG/PNG/GIF/WEBP)
 *
 *   ── analyzeDocument ──
 *   documentText — raw text (falls back to input.text / input.content)
 *
 * OPERATIONS:
 *   message          — Chat with Gemini (default)
 *   analyzeImage     — Vision: describe or answer questions about an image
 *   analyzeDocument  — Analyze a document / long text
 *   generatePrompt   — Write a prompt for a described task
 *
 * Output varies by operation.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = u.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/, /^0:0:0:0:0:0:0:1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/i, /^fe80:/i, /^fd/i,
    /\.internal$/, /\.local$/,
  ];
  if (blocked.some(r => r.test(h))) throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function getApiKey(credentialId, workspaceId) {
  const __accessToken = await getOAuthToken(credentialId, workspaceId, "Gemini");
  return __accessToken;
}

function handleError(err) {
  if (err.message?.startsWith("Gemini")) throw err;
  if (err.response?.status === 400) throw new Error(`Gemini: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 401) throw new Error("Gemini: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 403) throw new Error("Gemini: Invalid API key or access denied.");
  if (err.response?.status === 404) throw new Error(`Gemini: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`Gemini: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("Gemini: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Gemini: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Gemini failed: ${err.response?.status || err.code} — ${err.message}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

async function callGemini(apiKey, model, systemInstruction, parts, generationConfig) {
  const url = `${GEMINI_BASE}/${model}:generateContent`;
  const response = await axios.post(
    url,
    {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts }],
      generationConfig,
    },
    {
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      timeout: 120000,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024,
    },
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokensUsed =
    (response.data.usageMetadata?.promptTokenCount || 0) +
    (response.data.usageMetadata?.candidatesTokenCount || 0);
  return { text, tokensUsed };
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const {
    model = "gemini-2.0-flash",
    prompt,
    outputFormat = "text",
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  if (!prompt) return { success: false, error: "Gemini message: 'prompt' is required.", skipped: true };

  const system =
    outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.";

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;

  const genConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    ...(outputFormat === "json" && { responseMimeType: "application/json" }),
  };

  const { text, tokensUsed } = await callGemini(apiKey, model, system, [{ text: userMessage }], genConfig);

  let result = text;
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model, tokensUsed, provider: "gemini", operation: "message" };
}

async function opAnalyzeImage(config, input, apiKey) {
  const {
    model = "gemini-2.0-flash",
    prompt = "Describe this image in detail.",
    maxTokens = 1000,
    temperature = 0.5,
  } = config;

  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  if (!imageUrl) return { success: false, error: "Gemini analyzeImage: 'imageUrl' is required.", skipped: true };

  // Gemini supports inline base64 or URL fetch — fetch and inline
  let inlinePart;
  if (imageUrl.startsWith("data:")) {
    const [meta, data] = imageUrl.split(",");
    const mimeType = meta.replace("data:", "").replace(";base64", "");
    inlinePart = { inlineData: { mimeType, data } };
  } else {
    if (!/^https?:\/\//i.test(imageUrl)) {
      throw new Error("Gemini analyzeImage: imageUrl must be an http/https URL.");
    }
    assertSafeUrl(imageUrl);
    const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
    const mimeType = (imgResponse.headers["content-type"] || "image/jpeg").split(";")[0];
    const data = Buffer.from(imgResponse.data).toString("base64");
    inlinePart = { inlineData: { mimeType, data } };
  }

  const parts = [inlinePart, { text: prompt }];
  const { text, tokensUsed } = await callGemini(
    apiKey, model,
    "You are a helpful vision assistant. Analyze images thoroughly and answer questions accurately.",
    parts, { temperature, maxOutputTokens: maxTokens },
  );

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeImage" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const {
    model = "gemini-2.0-flash",
    prompt = "Summarize this document.",
    outputFormat = "text",
    temperature = 0.3,
    maxTokens = 4000,
  } = config;

  const documentText =
    config.documentText ||
    input?.text ||
    input?.content ||
    input?.body ||
    inputSummary(input);

  if (!documentText) throw new Error("Gemini analyzeDocument: provide 'documentText' or pass document text as input.");

  const system = outputFormat === "json"
    ? "You are a document analysis assistant. Respond with valid JSON only."
    : "You are a document analysis assistant. Analyze the provided document thoroughly.";

  const userMessage = `${prompt}\n\n---\nDocument:\n${documentText.substring(0, 30000)}`;
  const genConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    ...(outputFormat === "json" && { responseMimeType: "application/json" }),
  };

  const { text, tokensUsed } = await callGemini(apiKey, model, system, [{ text: userMessage }], genConfig);

  let result = text;
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model, tokensUsed, provider: "gemini", operation: "analyzeDocument" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "gemini-2.0-flash", maxTokens = 1000, temperature = 0.8 } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Gemini generatePrompt: 'task' description is required.", skipped: true };

  const { text, tokensUsed } = await callGemini(
    apiKey, model,
    "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations.",
    [{ text: `Write an effective AI prompt for this task: ${taskDescription}` }],
    { temperature, maxOutputTokens: maxTokens },
  );

  return { prompt: text, tokensUsed, provider: "gemini", operation: "generatePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Gemini: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Gemini: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Gemini: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};

/**
 * ANTHROPIC NODE
 *
 * Multi-operation Anthropic Claude node.
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — Claude model id (default per operation)
 *   prompt       — instruction / user message
 *   credentialId — Vault reference to Anthropic API key
 *   outputFormat — "json" | "text" (default: "text") — message/analyzeDocument
 *   temperature  — 0-1 (default: 0.7)
 *   maxTokens    — max response tokens (default: 2000)
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL or base64 data URI (JPEG/PNG/GIF/WEBP)
 *
 *   ── analyzeDocument ──
 *   documentText — raw text of the document (falls back to input.text / input.content)
 *
 * OPERATIONS:
 *   message          — Chat with Claude (default)
 *   analyzeImage     — Vision: describe or answer questions about an image
 *   analyzeDocument  — Analyze a document / long text with Claude
 *   improvePrompt    — Rewrite a prompt to be clearer and more effective
 *   generatePrompt   — Write a prompt for a described task
 *
 * Output varies by operation — see each handler.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const HEADERS_BASE = { "anthropic-version": "2023-06-01", "Content-Type": "application/json" };

async function getApiKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Anthropic");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message.startsWith("Anthropic")) throw err;
  if (err.response?.status === 401) throw new Error("Anthropic: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 429) throw new Error("Anthropic: Rate limit exceeded. Retry later.");
  if (err.response?.status === 404) {
    const model = err.config?.data ? JSON.parse(err.config.data)?.model : "unknown";
    throw new Error(`Anthropic: Model "${model}" not found. Try: claude-sonnet-4-20250514, claude-haiku-4-5-20251001.`);
  }
  throw new Error(`Anthropic failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

async function callAnthropic(apiKey, model, system, userContent, maxTokens, temperature) {
  const messages = [{ role: "user", content: userContent }];
  const response = await axios.post(
    API_URL,
    { model, max_tokens: maxTokens, system, messages, temperature },
    { headers: { "x-api-key": apiKey, ...HEADERS_BASE }, timeout: 120000, maxContentLength: 10 * 1024 * 1024 },
  );
  const text = response.data.content?.[0]?.text || "";
  const tokensUsed = (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0);
  return { text, model: response.data.model, tokensUsed };
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const {
    model = "claude-sonnet-4-20250514",
    prompt,
    outputFormat = "text",
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  if (!prompt) throw new Error("Anthropic message: 'prompt' is required.");

  const system =
    outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.";

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;
  const { text, model: usedModel, tokensUsed } = await callAnthropic(apiKey, model, system, userMessage, maxTokens, temperature);

  let result = text;
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: usedModel, tokensUsed, provider: "anthropic", operation: "message" };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = "claude-opus-4-20250514", prompt = "Describe this image in detail.", maxTokens = 1000, temperature = 0.5 } = config;
  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  if (!imageUrl) throw new Error("Anthropic analyzeImage: 'imageUrl' is required.");

  let imageContent;
  if (imageUrl.startsWith("data:")) {
    // base64 data URI: data:<mediaType>;base64,<data>
    const [meta, data] = imageUrl.split(",");
    const mediaType = meta.replace("data:", "").replace(";base64", "");
    imageContent = { type: "image", source: { type: "base64", media_type: mediaType, data } };
  } else {
    // Validate URL scheme to prevent SSRF
    if (!/^https?:\/\//i.test(imageUrl)) {
      throw new Error("Anthropic analyzeImage: imageUrl must be an http/https URL.");
    }
    // Anthropic requires base64 for images — fetch and convert
    const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
    const contentType = imgResponse.headers["content-type"] || "image/jpeg";
    const mediaType = contentType.split(";")[0];
    const base64 = Buffer.from(imgResponse.data).toString("base64");
    imageContent = { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  }

  const userContent = [imageContent, { type: "text", text: prompt }];
  const { text, model: usedModel, tokensUsed } = await callAnthropic(
    apiKey, model,
    "You are a helpful vision assistant. Analyze images thoroughly and answer questions accurately.",
    userContent, maxTokens, temperature,
  );

  return { result: text, model: usedModel, tokensUsed, provider: "anthropic", operation: "analyzeImage" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "claude-sonnet-4-20250514", prompt = "Summarize this document.", temperature = 0.3, maxTokens = 4000, outputFormat = "text" } = config;

  const documentText =
    config.documentText ||
    input?.text ||
    input?.content ||
    input?.body ||
    inputSummary(input);

  if (!documentText) throw new Error("Anthropic analyzeDocument: provide 'documentText' or pass document text as input.");

  const system = outputFormat === "json"
    ? "You are a document analysis assistant. Analyze the provided document and respond with valid JSON only."
    : "You are a document analysis assistant. Analyze the provided document thoroughly and answer questions about it.";

  const userMessage = `${prompt}\n\n---\nDocument:\n${documentText.substring(0, 30000)}`;
  const { text, model: usedModel, tokensUsed } = await callAnthropic(apiKey, model, system, userMessage, maxTokens, temperature);

  let result = text;
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: usedModel, tokensUsed, provider: "anthropic", operation: "analyzeDocument" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = "claude-haiku-4-5-20251001", maxTokens = 1000, temperature = 0.7 } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) throw new Error("Anthropic improvePrompt: 'prompt' to improve is required.");

  const { text, tokensUsed } = await callAnthropic(
    apiKey, model,
    "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective for AI models. Return only the improved prompt, no explanations or commentary.",
    `Improve this prompt:\n\n${originalPrompt}`,
    maxTokens, temperature,
  );

  return { improvedPrompt: text, originalPrompt, tokensUsed, provider: "anthropic", operation: "improvePrompt" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "claude-haiku-4-5-20251001", maxTokens = 1000, temperature = 0.8 } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) throw new Error("Anthropic generatePrompt: 'task' description is required.");

  const { text, tokensUsed } = await callAnthropic(
    apiKey, model,
    "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations.",
    `Write an effective AI prompt for this task: ${taskDescription}`,
    maxTokens, temperature,
  );

  return { prompt: text, tokensUsed, provider: "anthropic", operation: "generatePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  improvePrompt: opImprovePrompt,
  generatePrompt: opGeneratePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Anthropic: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const apiKey = await getApiKey(config.credentialId, context.workspaceId);

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};

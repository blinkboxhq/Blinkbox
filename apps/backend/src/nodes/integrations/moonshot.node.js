/**
 * MOONSHOT AI NODE (Kimi)
 *
 * OpenAI-compatible API. Supports chat, vision, long-context (8k/32k/128k).
 *
 * Config:
 *   operation    — "message" | "analyzeImage" | "analyzeDocument" | "generatePrompt" | "improvePrompt"
 *   model        — moonshot-v1-8k | moonshot-v1-32k | moonshot-v1-128k | moonshot-v1-8k-vision-preview
 *   prompt       — system instruction / user message
 *   credentialId — Vault reference to Moonshot API key
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-1 (default: 0.7)
 *   maxTokens    — max output tokens (default: 2000)
 *   imageUrl     — for analyzeImage operation
 *   documentText — for analyzeDocument operation
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.moonshot.cn/v1";

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Moonshot");
}

function handleError(err) {
  if (err.message?.startsWith("Moonshot")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.message;
  if (status === 401) throw new Error("Moonshot: Invalid API key.");
  if (status === 403) throw new Error(`Moonshot: Access denied — ${detail}`);
  if (status === 429) throw new Error("Moonshot: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`Moonshot: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`Moonshot: Server error (${status}) — ${detail}`);
  throw new Error(`Moonshot: ${status || err.code || "Error"} — ${detail}`);
}

function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 60000);
}

async function chatComplete(apiKey, model, messages, { temperature = 0.7, maxTokens = 2000, outputFormat = "text" } = {}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (outputFormat === "json") {
    body.response_format = { type: "json_object" };
  }
  const resp = await axios.post(`${BASE}/chat/completions`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 180000,
  });
  return resp;
}

async function opMessage(config, input, apiKey) {
  const { model = "moonshot-v1-8k", prompt, outputFormat = "text", temperature = 0.7, maxTokens = 2000 } = config;
  if (!prompt) return { success: false, error: "Moonshot: 'prompt' is required.", skipped: true };

  const systemMessage = outputFormat === "json"
    ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
    : "You are Kimi, a helpful AI assistant by Moonshot AI. Respond clearly and concisely.";

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;

  const resp = await chatComplete(apiKey, model,
    [{ role: "system", content: systemMessage }, { role: "user", content: userMessage }],
    { temperature, maxTokens, outputFormat },
  );

  const choice = resp.data.choices?.[0];
  let result = choice?.message?.content || "";

  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return {
    result,
    model: resp.data.model || model,
    tokensUsed: resp.data.usage?.total_tokens || 0,
    provider: "moonshot",
    operation: "message",
  };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { prompt = "Describe this image in detail.", imageUrl, maxTokens = 1500 } = config;
  const url = imageUrl || input?.imageUrl || input?.url;
  if (!url) return { success: false, error: "Moonshot analyzeImage: 'imageUrl' is required.", skipped: true };

  const resp = await axios.post(`${BASE}/chat/completions`, {
    model: "moonshot-v1-8k-vision-preview",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url } },
        { type: "text", text: prompt },
      ],
    }],
    max_tokens: maxTokens,
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 120000,
  });

  const result = resp.data.choices?.[0]?.message?.content || "";
  return { result, model: "moonshot-v1-8k-vision-preview", tokensUsed: resp.data.usage?.total_tokens || 0, provider: "moonshot", operation: "analyzeImage" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "moonshot-v1-128k", prompt = "Summarize this document.", temperature = 0.3, maxTokens = 4000 } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) throw new Error("Moonshot analyzeDocument: provide 'documentText' or pass document text as input.");

  const resp = await chatComplete(apiKey, model, [
    { role: "system", content: "You are a document analysis assistant. Analyze the provided document thoroughly." },
    { role: "user", content: `${prompt}\n\n---\nDocument:\n${documentText.substring(0, 100000)}` },
  ], { temperature, maxTokens });

  const result = resp.data.choices?.[0]?.message?.content || "";
  return { result, model: resp.data.model || model, tokensUsed: resp.data.usage?.total_tokens || 0, provider: "moonshot", operation: "analyzeDocument" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "moonshot-v1-8k", task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Moonshot generatePrompt: 'task' description is required.", skipped: true };

  const resp = await chatComplete(apiKey, model, [
    { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
    { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
  ], { temperature: 0.8, maxTokens: 1000 });

  const result = resp.data.choices?.[0]?.message?.content || "";
  return { prompt: result, tokensUsed: resp.data.usage?.total_tokens || 0, provider: "moonshot", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = "moonshot-v1-8k" } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "Moonshot improvePrompt: 'prompt' to improve is required.", skipped: true };

  const resp = await chatComplete(apiKey, model, [
    { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt." },
    { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
  ], { temperature: 0.7, maxTokens: 1000 });

  const result = resp.data.choices?.[0]?.message?.content || "";
  return { improvedPrompt: result, originalPrompt, tokensUsed: resp.data.usage?.total_tokens || 0, provider: "moonshot", operation: "improvePrompt" };
}

const OPERATIONS = {
  message: opMessage,
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Moonshot: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Moonshot: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Moonshot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};

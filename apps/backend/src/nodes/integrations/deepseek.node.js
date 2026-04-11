/**
 * DEEPSEEK NODE
 *
 * Multi-operation DeepSeek node. Uses OpenAI-compatible API.
 * Text-only (no vision). DeepSeek-Reasoner supported for complex reasoning tasks.
 *
 * Config:
 *   operation    — "message" | "reasoningMessage" | "generatePrompt" | "improvePrompt" (default: "message")
 *   model        — "deepseek-chat" (default) | "deepseek-reasoner"
 *   prompt       — instruction / user message
 *   credentialId — Vault reference to DeepSeek API key
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — max response tokens (default: 2000)
 *
 * OPERATIONS:
 *   message          — Standard chat completion with deepseek-chat
 *   reasoningMessage — Deep reasoning with deepseek-reasoner (returns result + reasoning)
 *   generatePrompt   — Write a prompt for a described task
 *   improvePrompt    — Rewrite a prompt to be clearer and more effective
 *
 * Output varies by operation.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.deepseek.com/chat/completions";

async function getApiKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "DeepSeek");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message.startsWith("DeepSeek")) throw err;
  if (err.response?.status === 401) throw new Error("DeepSeek: Invalid API key.");
  if (err.response?.status === 429) throw new Error("DeepSeek: Rate limit exceeded. Retry later.");
  if (err.response?.status === 400) throw new Error(`DeepSeek: Bad request — ${err.response?.data?.error?.message || err.message}`);
  throw new Error(`DeepSeek failed: ${err.response?.status || err.code} — ${err.message}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

async function callDeepSeek(apiKey, model, messages, temperature, maxTokens, jsonMode = false) {
  const response = await axios.post(
    API_URL,
    {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: "json_object" } }),
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 180000, // reasoner can be slow
      maxContentLength: 10 * 1024 * 1024,
    },
  );

  const choice = response.data.choices?.[0];
  return {
    content: choice?.message?.content || "",
    reasoning: choice?.message?.reasoning_content || null,
    model: response.data.model || model,
    tokensUsed: response.data.usage?.total_tokens || 0,
  };
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const {
    model = "deepseek-chat",
    prompt,
    outputFormat = "text",
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  if (!prompt) throw new Error("DeepSeek message: 'prompt' is required.");

  const systemMessage = outputFormat === "json"
    ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
    : "You are a helpful assistant. Respond clearly and concisely.";

  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
  ];

  const { content, model: usedModel, tokensUsed } = await callDeepSeek(apiKey, model, messages, temperature, maxTokens, outputFormat === "json");

  let result = content;
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: usedModel, tokensUsed, provider: "deepseek", operation: "message" };
}

async function opReasoningMessage(config, input, apiKey) {
  const { prompt, temperature = 0.6, maxTokens = 8000 } = config;
  if (!prompt) throw new Error("DeepSeek reasoningMessage: 'prompt' is required.");

  const messages = [
    { role: "system", content: "You are a careful reasoning assistant. Think step by step before answering." },
    { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
  ];

  // deepseek-reasoner doesn't support temperature or json_object
  const { content, reasoning, model: usedModel, tokensUsed } = await callDeepSeek(
    apiKey, "deepseek-reasoner", messages, undefined, maxTokens, false,
  );

  return {
    result: content,
    reasoning: reasoning || null,
    model: usedModel,
    tokensUsed,
    provider: "deepseek",
    operation: "reasoningMessage",
  };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "deepseek-chat", maxTokens = 1000, temperature = 0.8 } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) throw new Error("DeepSeek generatePrompt: 'task' description is required.");

  const messages = [
    { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
    { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
  ];

  const { content, tokensUsed } = await callDeepSeek(apiKey, model, messages, temperature, maxTokens);
  return { prompt: content, tokensUsed, provider: "deepseek", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = "deepseek-chat", maxTokens = 1000, temperature = 0.7 } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) throw new Error("DeepSeek improvePrompt: 'prompt' to improve is required.");

  const messages = [
    { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
    { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
  ];

  const { content, tokensUsed } = await callDeepSeek(apiKey, model, messages, temperature, maxTokens);
  return { improvedPrompt: content, originalPrompt, tokensUsed, provider: "deepseek", operation: "improvePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  reasoningMessage: opReasoningMessage,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`DeepSeek: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const apiKey = await getApiKey(config.credentialId, context.workspaceId);

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};

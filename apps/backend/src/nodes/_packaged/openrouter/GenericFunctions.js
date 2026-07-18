/**
 * OpenRouter — shared primitives. BASE url, default model constants, known-model
 * fallback list, ranking/attribution headers, credential resolution, auth
 * headers, error mapping, input summary, sampling params, the shared chat
 * caller, and the live-model-list helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://openrouter.ai/api/v1";

export const DEFAULT_CHAT_MODEL   = "deepseek/deepseek-v4-pro";
export const DEFAULT_VISION_MODEL = "openai/gpt-5.6";
export const DEFAULT_THINK_MODEL  = "deepseek/deepseek-r1";
export const DEFAULT_CODE_MODEL   = "qwen/qwen3-coder";

export const KNOWN_MODELS = [
  "anthropic/claude-opus-4-8",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-haiku-4-5",
  "openai/gpt-5.6",
  "openai/gpt-5.6-mini",
  "openai/o3",
  "google/gemini-3.5-pro",
  "google/gemini-3.5-flash",
  "x-ai/grok-4.3",
  "x-ai/grok-4-fast",
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-r1",
  "qwen/qwen3-coder",
  "qwen/qwen3-max",
  "qwen/qwen3.5-397b-a17b",
  "z-ai/glm-5.2",
  "z-ai/glm-4.7",
  "minimax/minimax-m2.1",
  "moonshotai/kimi-k2.6",
  "mistralai/mistral-large-3",
  "meta-llama/llama-4-maverick",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "cohere/command-a",
];

// Optional ranking/attribution headers OpenRouter uses on its leaderboards.
const REFERER = "https://blinkbox.app";
const TITLE = "Blinkbox";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "OpenRouter");
}

export function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": REFERER,
    "X-Title": TITLE,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("OpenRouter")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
  if (status === 401) throw new Error("OpenRouter: Invalid API key.");
  if (status === 402) throw new Error(`OpenRouter: Insufficient credits — ${detail}`);
  if (status === 403) throw new Error(`OpenRouter: Access denied — ${detail}`);
  if (status === 404) throw new Error(`OpenRouter: Model or resource not found — ${detail}`);
  if (status === 429) throw new Error("OpenRouter: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`OpenRouter: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`OpenRouter: Server error (${status}) — ${detail}`);
  throw new Error(`OpenRouter: ${status || err.code || "Error"} — ${detail}`);
}

export function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

export function samplingParams(config) {
  const p = {};
  if (config.temperature !== undefined && config.temperature !== "") p.temperature = Number(config.temperature);
  if (config.maxTokens) p.max_tokens = Number(config.maxTokens);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") p.frequency_penalty = Number(config.frequencyPenalty);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") p.presence_penalty = Number(config.presencePenalty);
  if (config.stop) p.stop = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
  return p;
}

export async function chat(apiKey, body, timeout = 120000) {
  const resp = await axios.post(`${BASE}/chat/completions`, body, {
    headers: authHeaders(apiKey),
    timeout,
    maxContentLength: 10 * 1024 * 1024,
  });
  return resp.data;
}

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  try {
    const resp = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
    const ids = (resp.data.data || resp.data.models || [])
      .map(m => (typeof m === "string" ? m : m.id))
      .filter(Boolean);
    return ids.length ? ids.sort() : KNOWN_MODELS;
  } catch {
    return KNOWN_MODELS;
  }
}

export function makeReq(apiKey) {
  return apiKey;
}

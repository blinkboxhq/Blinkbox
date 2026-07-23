/**
 * NVIDIA NIM — shared primitives. BASE url, default model constants (chat / code
 * / vision / embed), known-model fallback list, credential resolution, auth
 * headers, error mapping, input summary, sampling params, the shared chat
 * caller, and the live-model-list helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://integrate.api.nvidia.com/v1";

export const DEFAULT_CHAT_MODEL  = "nvidia/nemotron-3-super-120b-a12b";
export const DEFAULT_CODE_MODEL  = "qwen/qwen3-coder-480b-a35b-instruct";
export const DEFAULT_VISION_MODEL = "meta/llama-4-maverick-17b-128e-instruct";
export const DEFAULT_EMBED_MODEL = "nvidia/llama-nemotron-embed-1b-v2";

export const KNOWN_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "meta/llama-4-maverick-17b-128e-instruct",
  "meta/llama-4-scout-17b-16e-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-405b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "deepseek-ai/deepseek-v4-pro",
  "deepseek-ai/deepseek-v4-flash",
  "deepseek-ai/deepseek-r1",
  "moonshotai/kimi-k2.6",
  "qwen/qwen3-coder-480b-a35b-instruct",
  "qwen/qwen3.5-397b-a17b",
  "qwen/qwen3-max",
  "mistralai/mistral-large",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "minimaxai/minimax-m2.7",
  "microsoft/phi-4",
  "microsoft/phi-4-multimodal-instruct",
  "google/gemma-3-27b-it",
  "nvidia/llama-nemotron-embed-1b-v2",
  "nvidia/nv-embedqa-e5-v5",
  "nvidia/nv-embedqa-mistral-7b-v2",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "NvidiaNim");
}

export function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  if (err.message?.startsWith("NVIDIA NIM")) throw err;
  if (err.response?.status === 401) throw new Error("NVIDIA NIM: Invalid API key (nvapi-…).");
  if (err.response?.status === 403) throw new Error("NVIDIA NIM: Access forbidden — model not enabled for your key.");
  if (err.response?.status === 404) throw new Error(`NVIDIA NIM: Model or resource not found — ${err.response?.data?.detail || err.message}`);
  if (err.response?.status === 422) throw new Error(`NVIDIA NIM: Unprocessable request — ${err.response?.data?.detail || err.message}`);
  if (err.response?.status === 429) throw new Error("NVIDIA NIM: Rate limit exceeded (free tier is 40 req/min). Retry later.");
  if (err.response?.status === 400) throw new Error(`NVIDIA NIM: Bad request — ${err.response?.data?.detail || err.response?.data?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`NVIDIA NIM: Server error (${err.response.status}) — try again later.`);
  throw new Error(`NVIDIA NIM failed: ${err.response?.status || err.code} — ${err.response?.data?.detail || err.message}`);
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
  const response = await axios.post(`${BASE}/chat/completions`, body, {
    headers: authHeaders(apiKey),
    timeout,
    maxContentLength: 10 * 1024 * 1024,
  });
  return response.data;
}

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the nvapi- key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  try {
    const response = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 });
    const ids = (response.data.data || response.data.models || [])
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

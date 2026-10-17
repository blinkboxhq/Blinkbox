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
export const DEFAULT_CODE_MODEL  = "nvidia/nemotron-3-super-120b-a12b";
export const DEFAULT_VISION_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
export const DEFAULT_EMBED_MODEL = "nvidia/nemotron-3-embed-1b";

export const KNOWN_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3.5-super-vl-120b-a12b",
  "nvidia/nemotron-nano-3-30b-a3b",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "deepseek-ai/deepseek-v4.1-flash",
  "moonshotai/kimi-k2.6",
  "z-ai/glm-5.3",
  "z-ai/glm-5.3-flash",
  "google/gemma-4-31b-it",
  "meta/llama-3.2-90b-vision-instruct",
  "mistralai/mistral-large-2-instruct",
  "openai/gpt-oss-20b",
  "nvidia/nemotron-3-embed-1b",
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

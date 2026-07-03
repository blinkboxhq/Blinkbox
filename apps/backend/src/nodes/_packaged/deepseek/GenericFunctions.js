/**
 * DeepSeek — shared primitives. BASE url, default model constants, known-model
 * fallback list, credential resolution, error mapping, input summary, sampling
 * params, auth headers, the shared chat caller, and the live-model-list helper.
 * Extracted verbatim from the monolith. Text-only API — no vision/embeddings.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.deepseek.com";

export const DEFAULT_CHAT_MODEL = "deepseek-chat";
export const DEFAULT_REASON_MODEL = "deepseek-reasoner";

export const KNOWN_MODELS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-chat",
  "deepseek-reasoner",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "DeepSeek");
}

export function handleError(err) {
  if (err.message?.startsWith("DeepSeek")) throw err;
  if (err.response?.status === 401) throw new Error("DeepSeek: Invalid API key.");
  if (err.response?.status === 402) throw new Error("DeepSeek: Insufficient balance — top up at platform.deepseek.com.");
  if (err.response?.status === 403) throw new Error("DeepSeek: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error(`DeepSeek: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`DeepSeek: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("DeepSeek: Rate limit exceeded. Retry later.");
  if (err.response?.status === 400) throw new Error(`DeepSeek: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`DeepSeek: Server error (${err.response.status}) — try again later.`);
  throw new Error(`DeepSeek failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
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

export function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
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
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  try {
    const response = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
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

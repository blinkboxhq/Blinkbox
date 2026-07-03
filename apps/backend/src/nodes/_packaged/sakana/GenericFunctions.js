/**
 * Sakana Fugu — shared primitives. BASE url, default model constants, known-model
 * fallback list, credential resolution, auth headers, error mapping, input
 * summary, sampling params, the shared chat caller, and the live-model-list
 * helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.sakana.ai/v1";

export const DEFAULT_CHAT_MODEL   = "fugu";
export const DEFAULT_VISION_MODEL = "fugu-ultra";
export const DEFAULT_THINK_MODEL  = "fugu-ultra";
export const DEFAULT_CODE_MODEL   = "fugu-ultra";

export const KNOWN_MODELS = [
  "fugu",
  "fugu-ultra",
  "fugu-ultra-20260615",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Sakana");
}

export function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  if (err.message?.startsWith("Sakana")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Sakana: Invalid API key.");
  if (status === 403) throw new Error(`Sakana: Access denied — ${detail}`);
  if (status === 404) throw new Error(`Sakana: Model or resource not found — ${detail}`);
  if (status === 429) throw new Error("Sakana: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`Sakana: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`Sakana: Server error (${status}) — ${detail}`);
  throw new Error(`Sakana: ${status || err.code || "Error"} — ${detail}`);
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

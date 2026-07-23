/**
 * Z.ai (GLM) — shared primitives. BASE url, default model constants, known-model
 * fallback list, credential resolution, auth headers, error mapping, input
 * summary, sampling params, the shared chat caller, and the live-model-list
 * helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.z.ai/api/paas/v4";

export const DEFAULT_CHAT_MODEL   = "glm-5.2";
export const DEFAULT_VISION_MODEL = "glm-4.6v";
export const DEFAULT_THINK_MODEL  = "glm-5.2";
export const DEFAULT_CODE_MODEL   = "glm-5.2";

export const KNOWN_MODELS = [
  "glm-5.2",
  "glm-5.1",
  "glm-4.7",
  "glm-4.6v",
  "glm-4.5-air",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Z.ai");
}

export function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  if (err.message?.startsWith("Z.ai")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Z.ai: Invalid API key.");
  if (status === 403) throw new Error(`Z.ai: Access denied — ${detail}`);
  if (status === 404) throw new Error(`Z.ai: Model or resource not found — ${detail}`);
  if (status === 429) throw new Error("Z.ai: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`Z.ai: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`Z.ai: Server error (${status}) — ${detail}`);
  throw new Error(`Z.ai: ${status || err.code || "Error"} — ${detail}`);
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
    const resp = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 });
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

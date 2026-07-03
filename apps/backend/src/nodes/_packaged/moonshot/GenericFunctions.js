/**
 * Moonshot (Kimi) — shared primitives. BASE url, default model constants,
 * known-model fallback list, credential resolution, auth headers, error mapping,
 * input summary, sampling params, the shared chat caller, and the live-model-list
 * helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.moonshot.ai/v1";

export const DEFAULT_CHAT_MODEL   = "kimi-k2.6";
export const DEFAULT_VISION_MODEL = "kimi-k2.6";
export const DEFAULT_THINK_MODEL  = "kimi-k2-thinking";
export const DEFAULT_CODE_MODEL   = "kimi-k2.7-code";

export const KNOWN_MODELS = [
  "kimi-k2.7-code",
  "kimi-k2.6",
  "kimi-k2.5",
  "kimi-k2-thinking",
  "kimi-k2-instruct",
  "moonshot-v1-128k",
  "moonshot-v1-32k",
  "moonshot-v1-8k",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Moonshot");
}

export function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  if (err.message?.startsWith("Moonshot")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Moonshot: Invalid API key.");
  if (status === 403) throw new Error(`Moonshot: Access denied — ${detail}`);
  if (status === 404) throw new Error(`Moonshot: Model or resource not found — ${detail}`);
  if (status === 429) throw new Error("Moonshot: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`Moonshot: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`Moonshot: Server error (${status}) — ${detail}`);
  throw new Error(`Moonshot: ${status || err.code || "Error"} — ${detail}`);
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

/**
 * xAI (Grok) — shared primitives. BASE url, default model constants, known-model
 * fallback list, credential resolution, error mapping, inline-ref resolution
 * (SSRF-guarded), sampling params, auth headers, the shared chat caller, and the
 * live-model-list helper. Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const BASE = "https://api.x.ai/v1";

export const DEFAULT_CHAT_MODEL = "grok-4.3";
export const DEFAULT_REASON_MODEL = "grok-4.20";
export const DEFAULT_VISION_MODEL = "grok-4.3";
export const DEFAULT_IMAGE_MODEL = "grok-2-image";

export const KNOWN_MODELS = [
  "grok-4.3",
  "grok-4.20",
  "grok-4-fast",
  "grok-4.1",
  "grok-4",
  "grok-3",
  "grok-3-mini",
  "grok-code-fast",
  "grok-2-vision",
  "grok-2-image",
];

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "xAI");
}

export function handleError(err) {
  if (err.message?.startsWith("xAI")) throw err;
  if (err.response?.status === 401) throw new Error("xAI: Invalid API key.");
  if (err.response?.status === 403) throw new Error("xAI: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error(`xAI: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`xAI: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("xAI: Rate limit / quota exceeded — check console.x.ai.");
  if (err.response?.status === 400) throw new Error(`xAI: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`xAI: Server error (${err.response.status}) — try again later.`);
  throw new Error(`xAI failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

export function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

export async function resolveInlineRef(ref, label = "file") {
  if (!ref || typeof ref !== "string") throw new Error(`xAI: ${label} is required.`);
  if (ref.startsWith("data:")) return ref;
  if (/^https?:\/\//i.test(ref)) { await assertSafeUrlResolved(ref); return ref; }
  throw new Error(`xAI: ${label} must be an http/https URL or base64 data URI.`);
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
  const response = await axios.post(`${BASE}/chat/completions`, body, { headers: authHeaders(apiKey), timeout });
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

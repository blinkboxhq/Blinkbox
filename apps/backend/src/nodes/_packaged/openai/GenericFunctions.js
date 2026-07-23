/**
 * OpenAI — shared primitives. BASE URL, credential resolution, error mapping,
 * file/inline reference resolution (SSRF-guarded), sampling-param assembly, the
 * default chat model, and the live-model-list helper. Extracted verbatim from
 * the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const BASE = "https://api.openai.com/v1";
export const DEFAULT_CHAT_MODEL = "gpt-5.4";

export async function getApiKey(credentialId, workspaceId) {
  const __accessToken = await getOAuthToken(credentialId, workspaceId, "OpenAI");
  return __accessToken;
}

export function handleError(err, provider = "OpenAI") {
  if (err.message?.startsWith("OpenAI")) throw err;
  if (err.response?.status === 401) throw new Error(`${provider}: Invalid API key.`);
  if (err.response?.status === 403) throw new Error(`${provider}: Access forbidden — check your API key permissions.`);
  if (err.response?.status === 404) throw new Error(`${provider}: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`${provider}: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error(`${provider}: Quota exceeded — check your billing at platform.openai.com`);
  if (err.response?.status >= 500) throw new Error(`${provider}: Server error (${err.response.status}) — try again later.`);
  if (err.response?.status === 400) throw new Error(`${provider}: Bad request — ${err.response?.data?.error?.message || err.message}`);
  throw new Error(`${provider} failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

export function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

// Resolve a file reference (http/https URL — SSRF-guarded — or data URI / raw
// base64) into a Buffer the OpenAI multipart/JSON endpoints can consume.
export async function resolveFileToBuffer(ref, { maxBytes = 25 * 1024 * 1024, label = "file" } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`OpenAI: ${label} is required.`);
  if (ref.startsWith("data:")) {
    const b64 = ref.replace(/^data:[^;]+;base64,/, "");
    return Buffer.from(b64, "base64");
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 120000, maxContentLength: maxBytes, maxRedirects: 0 });
    return Buffer.from(res.data);
  }
  // assume raw base64
  return Buffer.from(ref, "base64");
}

// A file ref usable inline in chat content (image_url / input_file). Passes
// through data URIs and SSRF-checks http(s) URLs without downloading.
export async function resolveInlineRef(ref, label = "file") {
  if (!ref || typeof ref !== "string") throw new Error(`OpenAI: ${label} is required.`);
  if (ref.startsWith("data:")) return ref;
  if (/^https?:\/\//i.test(ref)) { await assertSafeUrlResolved(ref); return ref; }
  throw new Error(`OpenAI: ${label} must be an http/https URL or base64 data URI.`);
}

// Build the common sampling/advanced params from config, omitting unset ones so
// the provider applies its own defaults.
export function samplingParams(config) {
  const p = {};
  if (config.temperature !== undefined && config.temperature !== "") p.temperature = Number(config.temperature);
  if (config.maxTokens) p.max_tokens = Number(config.maxTokens);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") p.frequency_penalty = Number(config.frequencyPenalty);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") p.presence_penalty = Number(config.presencePenalty);
  if (config.seed !== undefined && config.seed !== "") p.seed = Number(config.seed);
  if (config.stop) p.stop = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
  if (config.user) p.user = String(config.user);
  return p;
}

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000,
  });
  return (response.data.data || [])
    .map(m => m.id)
    .filter(Boolean)
    .sort();
}

export function makeReq(apiKey) {
  return apiKey;
}

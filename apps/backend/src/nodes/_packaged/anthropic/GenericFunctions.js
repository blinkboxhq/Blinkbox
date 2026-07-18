/**
 * Anthropic (Claude Messages API) — shared primitives.
 * Constants, credential resolution, error mapping, sampling-param assembly,
 * SSRF-guarded media resolution, the core `callAnthropic` request, and the
 * live-model-list helper. All extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const API_URL = "https://api.anthropic.com/v1/messages";
export const MODELS_URL = "https://api.anthropic.com/v1/models";
export const ANTHROPIC_VERSION = "2023-06-01";
export const HEADERS_BASE = { "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" };

export const DEFAULT_MODEL = "claude-sonnet-4-6";
export const DEFAULT_FAST_MODEL = "claude-haiku-4-5";
export const DEFAULT_VISION_MODEL = "claude-sonnet-4-6";
export const DEFAULT_THINKING_MODEL = "claude-opus-4-8";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Anthropic");
}

export function handleError(err) {
  if (err.message?.startsWith("Anthropic")) throw err;
  if (err.response?.status === 401) throw new Error("Anthropic: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 403) throw new Error("Anthropic: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) {
    let model = "unknown";
    try { model = JSON.parse(err.config?.data || "{}")?.model || "unknown"; } catch { /* keep unknown */ }
    throw new Error(`Anthropic: Model "${model}" not found. Try: ${DEFAULT_MODEL}, ${DEFAULT_FAST_MODEL}, claude-opus-4-8.`);
  }
  if (err.response?.status === 400) throw new Error(`Anthropic: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`Anthropic: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("Anthropic: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Anthropic: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Anthropic failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

export function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

// Sampling/advanced params common to every Messages call, omitting unset ones.
export function samplingParams(config, defaults = {}) {
  const p = {};
  const temperature = config.temperature ?? defaults.temperature;
  if (temperature !== undefined && temperature !== "") p.temperature = Number(temperature);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") p.top_k = Number(config.topK);
  if (config.stop) {
    const seqs = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
    if (seqs.length) p.stop_sequences = seqs;
  }
  return p;
}

// Resolve an image/pdf reference into an Anthropic source block. http(s) is
// SSRF-guarded and downloaded to base64; data URIs and raw base64 pass through.
export async function resolveMediaSource(ref, { kind = "image", fallbackMime } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`Anthropic: ${kind} reference is required.`);

  if (ref.startsWith("data:")) {
    const [meta, data] = ref.split(",");
    const mediaType = meta.replace("data:", "").replace(";base64", "") || fallbackMime;
    return { type: "base64", media_type: mediaType, data };
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 60000, maxContentLength: 32 * 1024 * 1024, maxRedirects: 0 });
    const mediaType = (res.headers["content-type"] || fallbackMime || "").split(";")[0] || fallbackMime;
    return { type: "base64", media_type: mediaType, data: Buffer.from(res.data).toString("base64") };
  }
  // assume raw base64
  return { type: "base64", media_type: fallbackMime, data: ref };
}

export async function callAnthropic(apiKey, { model, system, content, maxTokens, sampling = {}, tools, toolChoice, thinking }) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
    ...(system ? { system } : {}),
    ...sampling,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(thinking ? { thinking } : {}),
  };
  const response = await axios.post(API_URL, body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE },
    timeout: 300000,
    maxContentLength: 32 * 1024 * 1024,
  });
  const blocks = response.data.content || [];
  const text = blocks.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  const thinkingText = blocks.filter(b => b.type === "thinking").map(b => b.thinking).join("\n").trim();
  const toolUses = blocks.filter(b => b.type === "tool_use").map(b => ({ id: b.id, name: b.name, input: b.input }));
  const usage = response.data.usage || {};
  return {
    text,
    thinkingText,
    toolUses,
    raw: response.data,
    model: response.data.model,
    stopReason: response.data.stop_reason,
    tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
  };
}

export function maybeJson(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const stripped = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { return text; }
}

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(MODELS_URL, {
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    timeout: 30000,
  });
  return (response.data.data || [])
    .map(m => m.id)
    .filter(Boolean)
    .sort();
}

export function makeReq(apiKey) {
  return apiKey;
}

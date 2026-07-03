/**
 * Gemini — shared primitives. BASE URLs, credential resolution, error mapping,
 * media-part resolution (SSRF-guarded), generation-config assembly, the shared
 * generateContent caller, JSON-fence stripping, and the live-model-list helper.
 * Extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const MODELS_URL = `${GEMINI_BASE}/models`;

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Gemini");
}

export function handleError(err) {
  if (err.message?.startsWith("Gemini")) throw err;
  const msg = err.response?.data?.error?.message || err.message;
  if (err.response?.status === 400) throw new Error(`Gemini: Bad request — ${msg}`);
  if (err.response?.status === 401) throw new Error("Gemini: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 403) throw new Error("Gemini: Invalid API key or access denied.");
  if (err.response?.status === 404) throw new Error(`Gemini: Resource not found — ${msg}`);
  if (err.response?.status === 422) throw new Error(`Gemini: Unprocessable request — ${msg}`);
  if (err.response?.status === 429) throw new Error("Gemini: Rate limit / quota exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Gemini: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Gemini failed: ${err.response?.status || err.code} — ${msg}`);
}

export function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

export function maybeJson(text) {
  if (typeof text !== "string") return text;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const stripped = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { return text; }
}

// Resolve a media ref (http/https URL — SSRF-guarded — or data: URI / raw
// base64) into a Gemini inlineData part.
export async function resolveInlinePart(ref, { fallbackMime, label = "file", maxBytes = 20 * 1024 * 1024 } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`Gemini: ${label} is required.`);
  if (ref.startsWith("data:")) {
    const [meta, data] = ref.split(",");
    const mimeType = meta.replace("data:", "").replace(";base64", "") || fallbackMime;
    return { inlineData: { mimeType, data } };
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 60000, maxContentLength: maxBytes, maxRedirects: 0 });
    const mimeType = (res.headers["content-type"] || fallbackMime || "application/octet-stream").split(";")[0];
    return { inlineData: { mimeType, data: Buffer.from(res.data).toString("base64") } };
  }
  return { inlineData: { mimeType: fallbackMime || "application/octet-stream", data: ref } };
}

export function generationConfig(config, defaults = {}) {
  const gen = {};
  const temperature = config.temperature ?? defaults.temperature;
  const maxTokens = config.maxTokens ?? defaults.maxTokens;
  if (temperature !== undefined && temperature !== "") gen.temperature = Number(temperature);
  if (maxTokens !== undefined && maxTokens !== "") gen.maxOutputTokens = Number(maxTokens);
  if (config.topP !== undefined && config.topP !== "") gen.topP = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") gen.topK = Number(config.topK);
  const stop = config.stop;
  if (stop) {
    const seqs = (Array.isArray(stop) ? stop : String(stop).split("\n")).map(s => s.trim()).filter(Boolean);
    if (seqs.length) gen.stopSequences = seqs.slice(0, 5);
  }
  return gen;
}

export async function callGemini(apiKey, model, { systemInstruction, parts, gen, tools, toolConfig } = {}) {
  const body = { contents: [{ role: "user", parts }] };
  if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };
  if (gen && Object.keys(gen).length) body.generationConfig = gen;
  if (tools) body.tools = tools;
  if (toolConfig) body.toolConfig = toolConfig;

  const response = await axios.post(`${MODELS_URL}/${model}:generateContent`, body, {
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    timeout: 180000,
    maxContentLength: 25 * 1024 * 1024,
    maxBodyLength: 25 * 1024 * 1024,
  });

  const candidate = response.data.candidates?.[0];
  const allParts = candidate?.content?.parts || [];
  const text = allParts.filter(p => p.text).map(p => p.text).join("");
  const functionCalls = allParts.filter(p => p.functionCall).map(p => p.functionCall);
  const images = allParts
    .filter(p => p.inlineData?.data)
    .map(p => ({ mimeType: p.inlineData.mimeType, base64: p.inlineData.data, dataUri: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }));
  const usage = response.data.usageMetadata || {};
  const tokensUsed = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);
  return { text, functionCalls, images, raw: response.data, finishReason: candidate?.finishReason, tokensUsed };
}

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(MODELS_URL, {
    headers: { "x-goog-api-key": apiKey }, timeout: 30000, params: { pageSize: 200 },
  });
  return (response.data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).some(x => x === "generateContent" || x === "embedContent"))
    .map(m => (m.name || "").replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}

export function makeReq(apiKey) {
  return apiKey;
}

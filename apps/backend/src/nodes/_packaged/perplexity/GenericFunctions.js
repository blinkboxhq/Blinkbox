/**
 * Perplexity (Sonar) — shared primitives. API url, credential resolution, error
 * mapping, JSON-coercion helper, sampling body, search-domain/recency filters, the
 * shared chat-completions caller, and the known-model list. Extracted verbatim
 * from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const API_URL = "https://api.perplexity.ai/chat/completions";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Perplexity");
}

export function handleError(err) {
  if (err.message?.startsWith("Perplexity")) throw err;
  const msg = err.response?.data?.error?.message || err.message;
  if (err.response?.status === 400) throw new Error(`Perplexity: Bad request — ${msg}`);
  if (err.response?.status === 401) throw new Error("Perplexity: Invalid API key.");
  if (err.response?.status === 403) throw new Error("Perplexity: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("Perplexity: Resource not found — check the model name.");
  if (err.response?.status === 422) throw new Error(`Perplexity: Unprocessable request — ${msg}`);
  if (err.response?.status === 429) throw new Error("Perplexity: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Perplexity: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Perplexity failed: ${err.response?.status || err.code} — ${msg}`);
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

export function samplingBody(config, defaults = {}) {
  const body = {};
  const temperature = config.temperature ?? defaults.temperature;
  const maxTokens = config.maxTokens ?? defaults.maxTokens;
  if (temperature !== undefined && temperature !== "") body.temperature = Number(temperature);
  if (maxTokens !== undefined && maxTokens !== "") body.max_tokens = Number(maxTokens);
  if (config.topP !== undefined && config.topP !== "") body.top_p = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") body.top_k = Number(config.topK);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") body.presence_penalty = Number(config.presencePenalty);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") body.frequency_penalty = Number(config.frequencyPenalty);
  return body;
}

// Search-domain / recency filters apply to grounded ops.
export function searchFilters(config) {
  const extra = {};
  if (config.searchRecency) extra.search_recency_filter = config.searchRecency;
  if (config.searchDomains) {
    const domains = String(config.searchDomains).split(/[\n,]/).map(d => d.trim()).filter(Boolean);
    if (domains.length) extra.search_domain_filter = domains.slice(0, 10);
  }
  return extra;
}

export async function callPerplexity(apiKey, { model, system, user, sampling, extra, responseFormat } = {}) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });

  const body = { model, messages, ...sampling, ...extra };
  if (responseFormat) body.response_format = responseFormat;

  const response = await axios.post(API_URL, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 300000,
    maxContentLength: 25 * 1024 * 1024,
    maxBodyLength: 25 * 1024 * 1024,
  });

  const choice = response.data.choices?.[0];
  const text = choice?.message?.content || "";
  const citations = response.data.citations || response.data.search_results || [];
  return {
    text,
    citations,
    model: response.data.model || model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    finishReason: choice?.finish_reason,
    raw: response.data,
  };
}

// Perplexity has no public /models endpoint — return the current Sonar family.
export const KNOWN_MODELS = [
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
  "sonar-deep-research",
];

export async function listModels(credentialId, workspaceId) {
  // Validate the credential resolves, then return the known Sonar family.
  await getApiKey(credentialId, workspaceId);
  return [...KNOWN_MODELS];
}

export function makeReq(apiKey) {
  return apiKey;
}

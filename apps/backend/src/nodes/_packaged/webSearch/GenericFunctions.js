/**
 * WEB SEARCH (Tavily) — shared primitives. Resolves the Tavily API-key
 * credential and builds the JSON POST client. Error mapping is preserved
 * verbatim from the monolith. Handlers receive (config, ctx) where ctx is
 * { apiKey }.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.tavily.com";
export const MAX_RESULTS_LIMIT = 20;

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Web Search");
}

export async function post(path, payload) {
  const { data } = await axios.post(`${BASE}${path}`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 120000,
    maxContentLength: 5 * 1024 * 1024,
  });
  return data;
}

export function asArray(val) {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null || val === "") return [];
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val]; }
    catch { return val.split(",").map((s) => s.trim()).filter(Boolean); }
  }
  return [val];
}

export function handleError(err) {
  if (err?.message?.startsWith("Web Search:")) throw err;
  if (err.response?.status === 401) throw new Error("Web Search: Invalid Tavily API key.");
  if (err.response?.status === 429) throw new Error("Web Search: Rate limit exceeded. Retry later.");
  throw new Error(`Web Search failed: ${err.response?.status || err.code} — ${err.message}`);
}

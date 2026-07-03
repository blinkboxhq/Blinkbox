/**
 * PINECONE — shared primitives. Resolves the API-key credential, guards the
 * user-supplied index host against SSRF, builds request headers, parses array
 * inputs, and maps errors verbatim. Handlers receive (config, apiKey).
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Pinecone");
}

export async function assertIndexHost(host) {
  if (!host) throw new Error("Pinecone: 'indexHost' is required.");
  await assertSafeUrlResolved(host);
}

export function buildHeaders(apiKey) {
  return { "Api-Key": apiKey, "Content-Type": "application/json" };
}

export function parseArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
  return fallback;
}

export function parseObject(val) {
  if (typeof val === "object" && val !== null) return val;
  if (typeof val === "string" && val.trim()) { try { return JSON.parse(val); } catch { return undefined; } }
  return undefined;
}

export function handleError(err) {
  if (err.response?.status === 401) throw new Error("Pinecone: Invalid API key.");
  if (err.response?.status === 404) throw new Error("Pinecone: Index not found. Check your index host URL.");
  if (err.response?.status === 400) throw new Error(`Pinecone: Bad request — ${err.response?.data?.message || err.message}`);
  throw new Error(`Pinecone failed: ${err.response?.status || err.code} — ${err.message}`);
}

/**
 * RESEND — shared primitives. Resolves the API-key credential, builds an authed
 * axios client bound to api.resend.com, and maps errors verbatim. Handlers
 * receive (config, apiKey). Kept the original getApiKey / handleError / headers
 * shapes exactly; added a small parseJson helper and asArray for the batch and
 * audience surfaces.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.resend.com";

export async function getApiKey(credentialId, workspaceId) {
  const __accessToken = await getOAuthToken(credentialId, workspaceId, "Resend");
  return __accessToken;
}

export function headers(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export function asArray(v) {
  if (v === undefined || v === null || v === "") return undefined;
  return Array.isArray(v) ? v : [v];
}

export function parseJson(val) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return undefined;
  return JSON.parse(val);
}

export function handleError(err) {
  if (err.response?.status === 401) throw new Error("Resend: Invalid API key.");
  if (err.response?.status === 422) throw new Error(`Resend: ${err.response?.data?.message || "Validation error."}`);
  if (err.response?.status === 429) throw new Error("Resend: Rate limit exceeded.");
  throw new Error(`Resend failed: ${err.response?.status || err.code} — ${err.message}`);
}

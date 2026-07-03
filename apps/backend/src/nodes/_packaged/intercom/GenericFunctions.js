/**
 * INTERCOM — shared primitives for the modular node. Bearer client factory
 * (pinned Intercom-Version), JSON-field parsing, per-page clamping, op-name
 * aliases and error mapping. Handlers receive (config, { api }).
 *
 * Import depth: this file lives at _packaged/intercom/, so utils are three
 * levels up. Production nixpacks build context is apps/backend only.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE_URL = "https://api.intercom.io";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Intercom");
}

export function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Intercom-Version": "2.10",
    },
  });
}

/** Clamp a per_page request to Intercom's 150 ceiling. */
export function perPage(limit, fallback = 25) {
  return Math.min(Number(limit) || fallback, 150);
}

export function parseJson(value, fieldName) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Intercom: ${fieldName} must be valid JSON.`);
  }
}

/** Aliases mapping legacy op names onto their canonical handlers. */
export const OP_ALIAS = {
  replyToConversation: "replyConversation",
  tagContact: "addTag",
};

export function handleError(err) {
  if (err.message?.startsWith("Intercom")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors?.[0]?.message ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Intercom: Auth failed — ${msg}. Check your access token.`);
  if (status === 403) throw new Error(`Intercom: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`Intercom: Resource not found — ${msg}.`);
  if (status === 409) throw new Error(`Intercom: Conflict — ${msg}. A contact with this email may already exist.`);
  if (status === 422) throw new Error(`Intercom: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Intercom: Rate limit exceeded — slow down requests.`);
  throw new Error(`Intercom: ${status ?? "Error"} — ${msg}`);
}

/**
 * TYPEFORM — shared primitives. Resolves the personal-access-token credential,
 * builds a small authed client bound to api.typeform.com, and maps errors
 * verbatim. Handlers receive (config, client) where client is { headers, get,
 * post, put, del }.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.typeform.com";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Typeform");
}

export function makeClient(token) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  return {
    headers,
    get: (path, opts = {}) => axios.get(`${BASE}${path}`, { headers, timeout: 15000, ...opts }),
    post: (path, body, opts = {}) => axios.post(`${BASE}${path}`, body, { headers, timeout: 15000, ...opts }),
    put: (path, body, opts = {}) => axios.put(`${BASE}${path}`, body, { headers, timeout: 15000, ...opts }),
    del: (path, opts = {}) => axios.delete(`${BASE}${path}`, { headers, timeout: 15000, ...opts }),
  };
}

export function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return undefined;
  return JSON.parse(val);
}

export function handleError(err) {
  if (err.message?.startsWith("Typeform")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.description ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Typeform: Authentication failed — check your personal access token.`);
  if (status === 403) throw new Error(`Typeform: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`Typeform: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Typeform: Bad request — ${msg}`);
  if (status === 422) throw new Error(`Typeform: Validation error — ${msg}`);
  if (status === 429) throw new Error(`Typeform: Rate limit exceeded — slow down requests.`);
  throw new Error(`Typeform: ${status ?? "Error"} — ${msg}`);
}

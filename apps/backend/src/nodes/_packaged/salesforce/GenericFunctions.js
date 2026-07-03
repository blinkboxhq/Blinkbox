/**
 * SALESFORCE — shared primitives. Credential resolution (accessToken +
 * instanceUrl), an authed client bound to the instance's /services/data base,
 * the JSON-field parser and the verbatim error mapper. Handlers receive
 * (config, client).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const API_VERSION = "v59.0";

export async function getCredentials(credentialId, workspaceId, configInstanceUrl) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Salesforce");
  if (typeof raw === "object" && raw.accessToken) {
    return { accessToken: raw.accessToken, instanceUrl: raw.instanceUrl };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed.accessToken) return { accessToken: parsed.accessToken, instanceUrl: parsed.instanceUrl };
  } catch {
    // plain token — use instanceUrl from config
  }
  if (!configInstanceUrl) throw new Error("Salesforce credential must include instanceUrl, or set instanceUrl in node config.");
  return { accessToken: raw, instanceUrl: configInstanceUrl };
}

export function parseFields(value, fieldName) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Salesforce ${fieldName}: must be valid JSON.`);
  }
}

export function num(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return max ? Math.min(n, max) : n;
}

/** Bind get/post/patch/del to `${instanceUrl}/services/data/${API_VERSION}`. */
export function makeClient(accessToken, instanceUrl) {
  const base = `${instanceUrl}/services/data/${API_VERSION}`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const enc = encodeURIComponent;
  const req = (method, path, data, opts = {}) =>
    axios({ method, url: `${base}${path}`, data, headers, timeout: opts.timeout ?? 15000, params: opts.params });
  return {
    headers,
    enc,
    base,
    get: (path, opts) => req("get", path, undefined, opts),
    post: (path, data, opts) => req("post", path, data, opts),
    patch: (path, data, opts) => req("patch", path, data, opts),
    del: (path, opts) => req("delete", path, undefined, opts),
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Salesforce")) throw err;
  const status = err.response?.status;
  const sfErrors = err.response?.data;
  const msg = Array.isArray(sfErrors) ? sfErrors[0]?.message : (sfErrors?.message ?? err.message);
  if (status === 401) throw new Error(`Salesforce: Auth failed — ${msg}. Token may be expired or invalid.`);
  if (status === 403) throw new Error(`Salesforce: Permission denied — ${msg}. Check object/field-level security.`);
  if (status === 404) throw new Error(`Salesforce: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Salesforce: Bad request — ${msg}.`);
  if (status === 422) throw new Error(`Salesforce: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Salesforce: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Salesforce: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Salesforce: ${status ?? "Error"} — ${msg}`);
}

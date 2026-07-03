/**
 * PAYPAL — shared primitives. Credential resolution (clientId/clientSecret
 * JSON), client-credentials token exchange, an authed client bound to the
 * PayPal REST base URL, small helpers and the verbatim error mapper.
 * Handlers receive (config, client).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api-m.paypal.com";

export async function getCredentials(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "PayPal");
  if (typeof raw === "object" && raw.clientId) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.clientId || !parsed.clientSecret) throw new Error("Missing clientId or clientSecret");
    return parsed;
  } catch {
    throw new Error("PayPal credential must be JSON with clientId and clientSecret.");
  }
}

export async function getAccessToken(clientId, clientSecret) {
  const b64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const { data } = await axios.post(
    `${BASE}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${b64}`, "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    },
  );
  if (!data.access_token) throw new Error("PayPal OAuth token exchange returned no access_token.");
  return data.access_token;
}

export function num(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return max ? Math.min(n, max) : n;
}

/** Parse a JSON-or-object field; throws a PayPal-prefixed error on invalid JSON. */
export function parseJson(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`PayPal: '${fieldName}' is not valid JSON.`);
  }
}

export function money(currency, amount) {
  return { currency_code: String(currency).toUpperCase(), value: String(amount) };
}

/** Bind get/post/patch/del to the PayPal base URL with sane timeouts. */
export function makeClient(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const enc = encodeURIComponent;
  const req = (method, path, data, opts = {}) =>
    axios({ method, url: `${BASE}${path}`, data, headers, timeout: opts.timeout ?? 15000, params: opts.params });
  return {
    headers,
    enc,
    get: (path, opts) => req("get", path, undefined, opts),
    post: (path, data, opts) => req("post", path, data, opts),
    patch: (path, data, opts) => req("patch", path, data, opts),
    del: (path, opts) => req("delete", path, undefined, opts),
  };
}

export function handleError(err) {
  if (err.message?.startsWith("PayPal")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.details?.[0]?.description ?? err.message;
  if (status === 401) throw new Error(`PayPal: Auth failed — ${msg}. Check your clientId and clientSecret.`);
  if (status === 403) throw new Error(`PayPal: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`PayPal: Resource not found — ${msg}.`);
  if (status === 400 || status === 422) throw new Error(`PayPal: Bad request — ${msg}.`);
  if (status === 429) throw new Error(`PayPal: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`PayPal: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`PayPal: ${status ?? "Error"} — ${msg}`);
}

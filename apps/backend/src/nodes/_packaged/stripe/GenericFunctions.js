/**
 * Stripe — shared helpers for all v1 action files.
 * The `req` function (makeReq output) is built by the backend entry
 * (apps/backend/.../stripe.node.js) with the resolved secret key and passed
 * into every handler. Bodies are form-encoded (application/x-www-form-urlencoded).
 */
import axios from "axios";

export const BASE = "https://api.stripe.com/v1";

export const skip = (op, msg) => ({ success: false, error: `Stripe ${op}: ${msg}`, skipped: true });
export const lim = (v, d) => Math.min(Number(v ?? d) || d, 100);
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
export const enc = encodeURIComponent;

export function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

export function flatten(obj, params = new URLSearchParams(), prefix = "") {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") flatten(item, params, `${key}[${i}]`);
        else params.append(`${key}[${i}]`, String(item));
      });
    } else if (typeof v === "object") {
      flatten(v, params, key);
    } else {
      params.set(key, String(v));
    }
  }
  return params;
}

export function makeReq(apiKey) {
  return function stripeReq(method, path, data) {
    const params = data ? flatten(data) : null;
    return axios({
      method,
      url: `${BASE}${path}`,
      data: method !== "GET" && params ? params.toString() : undefined,
      params: method === "GET" && params ? Object.fromEntries(params) : undefined,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": method !== "GET" ? "application/x-www-form-urlencoded" : undefined,
      },
      timeout: 120000,
    }).then((r) => r.data);
  };
}

export const ok = (data) => ({ success: true, ...data });
export const list = (data) => ({ success: true, data: data.data, count: data.data?.length || 0, has_more: data.has_more });

export function metadata(config) {
  if (!config.metadata) return undefined;
  if (typeof config.metadata === "object") return config.metadata;
  try { return JSON.parse(config.metadata); } catch { return undefined; }
}

export function handleError(err) {
  if (err.message?.startsWith("Stripe")) throw err;
  const code = err.response?.data?.error?.code;
  const msg = err.response?.data?.error?.message ?? err.message;
  const status = err.response?.status;
  if (status === 401) throw new Error("Stripe: Invalid API key — check your secret key in the credential vault.");
  if (status === 400) throw new Error(`Stripe: Bad request — ${msg}`);
  if (status === 402) throw new Error(`Stripe: Payment required / card declined — ${msg}`);
  if (status === 403) throw new Error(`Stripe: Forbidden — ${msg}`);
  if (status === 404) throw new Error(`Stripe: Resource not found — ${msg}`);
  if (status === 409) throw new Error(`Stripe: Conflict — ${msg}`);
  if (status === 422) throw new Error(`Stripe: Unprocessable entity — ${msg}`);
  if (status === 429) throw new Error(`Stripe: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Stripe: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Stripe: ${code ?? status ?? "Error"} — ${msg}`);
}

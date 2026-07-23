/**
 * Shopify — shared helpers for all v1 action files.
 * The `{ api }` requester (an axios instance for the store's Admin REST API)
 * is built by the backend entry (apps/backend/.../shopify.node.js) with the
 * resolved access token + store domain, and passed into every handler.
 */
import axios from "axios";

export const API_VERSION = "2024-04";

export const skip = (op, msg) => ({ success: false, error: `Shopify ${op}: ${msg}`, skipped: true });
export const lim = (v, d) => Math.min(Number(v ?? d) || d, 250);
export const enc = encodeURIComponent;

export function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

export function makeApi(shop, token) {
  const host = String(shop).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return axios.create({
    baseURL: `https://${host}/admin/api/${API_VERSION}`,
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    timeout: 120000,
  });
}

export function handleError(err) {
  if (err.message?.startsWith("Shopify")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors ?? err.message;
  if (status === 401) throw new Error("Shopify: Authentication failed — check your Admin API access token.");
  if (status === 403) throw new Error(`Shopify: Permission denied — ${JSON.stringify(msg)}. Verify API scopes.`);
  if (status === 404) throw new Error(`Shopify: Resource not found — ${JSON.stringify(msg)}.`);
  if (status === 406) throw new Error("Shopify: Not acceptable — request format issue.");
  if (status === 422) throw new Error(`Shopify: Validation error — ${JSON.stringify(msg)}.`);
  if (status === 429) throw new Error("Shopify: Rate limit exceeded (Leaky Bucket) — slow down requests.");
  if (status >= 500) throw new Error(`Shopify: Server error (${status}) — try again later.`);
  throw new Error(`Shopify: ${status ?? "Error"} — ${JSON.stringify(msg)}`);
}

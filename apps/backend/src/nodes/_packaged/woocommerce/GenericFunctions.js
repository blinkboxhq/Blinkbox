/**
 * WOOCOMMERCE — shared primitives. Resolves the consumer key/secret credential
 * (stored as JSON, or a bare consumer key), builds an axios client bound to the
 * store's /wp-json/wc/v3 base, plus small helpers and the verbatim error mapper.
 * Handlers receive (config, api) where api is the axios instance.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "WooCommerce");
  try {
    return JSON.parse(raw);
  } catch {
    return { consumerKey: raw, consumerSecret: "" };
  }
}

export function makeClient(storeUrl, consumerKey, consumerSecret) {
  const base = storeUrl.replace(/\/$/, "") + "/wp-json/wc/v3";
  return axios.create({
    baseURL: base,
    auth: { username: consumerKey, password: consumerSecret },
    timeout: 120000,
  });
}

export function perPage(limit, fallback = 20, max = 100) {
  return Math.min(Number(limit) || fallback, max);
}

export function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return undefined;
  try { return JSON.parse(val); }
  catch { throw new Error(`WooCommerce: Invalid JSON for '${label}'.`); }
}

export function handleError(err) {
  if (err.message?.startsWith("WooCommerce")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.code ?? err.message;
  if (status === 401) throw new Error(`WooCommerce: Authentication failed — check consumer key and secret.`);
  if (status === 403) throw new Error(`WooCommerce: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`WooCommerce: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`WooCommerce: Bad request — ${msg}`);
  if (status === 422) throw new Error(`WooCommerce: Validation error — ${msg}`);
  if (status === 429) throw new Error(`WooCommerce: Rate limit exceeded — slow down requests.`);
  throw new Error(`WooCommerce: ${status ?? "Error"} — ${msg}`);
}

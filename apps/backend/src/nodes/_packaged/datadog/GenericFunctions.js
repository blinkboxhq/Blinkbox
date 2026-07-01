/**
 * Datadog — shared helpers for all v1 action files.
 * The requester object `{ v1, v2, site, headers }` (makeRequester output) is
 * built by the backend entry (apps/backend/.../datadog.node.js) with the
 * resolved API key + Application key and passed into every handler.
 * v1/v2 are axios instances (site-aware base URLs).
 */
import axios from "axios";

export const skip = (op, msg) => ({ success: false, error: `Datadog ${op}: ${msg}`, skipped: true });
export const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
export const flt = (v, d) => (v === undefined || v === "" ? d : parseFloat(v) || d);
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
export const nowSec = () => Math.floor(Date.now() / 1000);

export function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

export function makeRequester({ apiKey, appKey, site }) {
  const headers = {
    "DD-API-KEY": apiKey,
    "DD-APPLICATION-KEY": appKey || "",
    "Content-Type": "application/json",
  };
  const v1 = axios.create({ baseURL: `https://api.${site}/api/v1`, headers, timeout: 15000 });
  const v2 = axios.create({ baseURL: `https://api.${site}/api/v2`, headers, timeout: 15000 });
  return { v1, v2, site, headers };
}

export function handleError(err) {
  if (err.message?.startsWith("Datadog")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? err.message;
  if (status === 400) throw new Error(`Datadog: Bad request — ${msg}`);
  if (status === 401) throw new Error(`Datadog: Authentication failed — check your API key and Application key.`);
  if (status === 403) throw new Error(`Datadog: Forbidden — ${msg}. App key may lack permissions.`);
  if (status === 404) throw new Error(`Datadog: Not found — ${msg}`);
  if (status === 409) throw new Error(`Datadog: Conflict — ${msg}`);
  if (status === 429) throw new Error(`Datadog: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Datadog: ${status ?? "Network"} error — ${msg}`);
}

/**
 * Zendesk — shared helpers for all v1 action files.
 * The `{ api }` requester (an axios instance) is built by the backend entry
 * (apps/backend/.../zendesk.node.js) with the resolved email + API token and
 * passed into every handler. Per-account base: https://{sub}.zendesk.com/api/v2
 */
import axios from "axios";

export { axios };

export const skip = (op, msg) => ({ success: false, error: `Zendesk ${op}: ${msg}`, skipped: true });
export const lim = (v, d = 100) => Math.min(Number(v ?? d) || d, 100);
export const enc = encodeURIComponent;
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
export const num = (v) => (v === undefined || v === null || v === "" ? undefined : parseInt(v, 10));

export function need(config, key, op) {
  if (config[key] === undefined || config[key] === null || config[key] === "") return skip(op, `'${key}' is required.`);
  return null;
}

export function parseJson(value, op, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Zendesk ${op}: '${field}' must be valid JSON.`);
  }
}

export function handleError(err) {
  if (err.message?.startsWith("Zendesk")) throw err;
  const status = err.response?.status;
  const desc = err.response?.data?.description || err.response?.data?.error || JSON.stringify(err.response?.data?.details || err.message);
  if (status === 401) throw new Error("Zendesk: Invalid email or API token.");
  if (status === 403) throw new Error(`Zendesk: Forbidden — ${desc}. Check your agent permissions.`);
  if (status === 404) throw new Error(`Zendesk: Resource not found — ${desc}`);
  if (status === 409) throw new Error(`Zendesk: Conflict — ${desc}`);
  if (status === 422) throw new Error(`Zendesk: Validation error — ${desc}`);
  if (status === 429) throw new Error("Zendesk: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`Zendesk: Server error (${status}) — try again later.`);
  throw new Error(`Zendesk: ${status || err.code} — ${err.message}`);
}

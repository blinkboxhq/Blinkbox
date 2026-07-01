/**
 * Calendly — shared helpers for all v1 action files.
 * The authenticated axios `api` instance is built by the entry node
 * (apps/backend/.../calendly.node.js) and passed into every handler as { api }.
 * Nothing here touches credentials or env — pure request/formatting logic.
 */

export const BASE_URL = "https://api.calendly.com";

export const skip = (op, msg) => ({ success: false, error: `Calendly ${op}: ${msg}`, skipped: true });

export const cnt = (v, d = 20) => Math.min(Number(v ?? d) || d, 100);

export const csv = (v) =>
  Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

export const uuidOf = (uri) => String(uri || "").split("/").pop();

export function need(config, key, op) {
  if (config[key] === undefined || config[key] === null || config[key] === "") {
    return skip(op, `'${key}' is required.`);
  }
  return null;
}

export async function me(api) {
  const { data } = await api.get("/users/me");
  return data.resource;
}

export function pageParams(config) {
  const p = { count: cnt(config.count) };
  if (config.pageToken) p.page_token = config.pageToken;
  return p;
}

export function handleError(err) {
  if (err.message?.startsWith("Calendly")) throw err;
  const status = err.response?.status;
  const msg =
    err.response?.data?.message ??
    err.response?.data?.title ??
    JSON.stringify(err.response?.data?.details || err.message);
  if (status === 401) throw new Error("Calendly: Authentication failed — check your access token.");
  if (status === 403) throw new Error(`Calendly: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`Calendly: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Calendly: Bad request — ${msg}`);
  if (status === 422) throw new Error(`Calendly: Validation error — ${msg}`);
  if (status === 429) throw new Error("Calendly: Rate limit exceeded — slow down requests.");
  if (status >= 500) throw new Error(`Calendly: Server error (${status}) — try again later.`);
  throw new Error(`Calendly: ${status ?? "Error"} — ${msg}`);
}

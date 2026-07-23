/**
 * Sentry — shared helpers for all v1 action files.
 * The requester (`ctx = { org, headers }`) is built by makeReq() from the
 * resolved token + config; every handler is called `(config, ctx, context)` —
 * the same calling convention as the original monolith.
 *
 * Auth: Sentry API auth token (Bearer). captureEvent uses the project DSN.
 */
import axios from "axios";

export const BASE = "https://sentry.io/api/0";
export const enc = encodeURIComponent;
export const csv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
export const LIMIT = (config, def = 25) => Math.min(Number(config.limit || def), 100);

export function skip(op, msg) {
  return { success: false, error: `Sentry ${op}: ${msg}.`, skipped: true };
}

export const get = (url, ctx) => axios.get(url, { headers: ctx.headers, timeout: 120000 }).then((r) => r.data);
export const post = (url, body, ctx) => axios.post(url, body, { headers: ctx.headers, timeout: 120000 }).then((r) => r.data);
export const put = (url, body, ctx) => axios.put(url, body, { headers: ctx.headers, timeout: 120000 }).then((r) => r.data);
export const del = (url, ctx) => axios.delete(url, { headers: ctx.headers, timeout: 120000 }).then((r) => r.data);

export const needOrg = (config, ctx, op) => (ctx.org ? null : skip(op, "'organization' slug required"));
export const needIssue = (config, op) => (config.issueId ? null : skip(op, "'issueId' required"));

export function makeReq(token, config = {}) {
  const org = config.organization || config.org || "";
  return { org, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

export function handleError(err) {
  if (err.message?.startsWith("Sentry")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
  if (status === 401 || status === 403) throw new Error(`Sentry: Auth failed (${status}) — check your API token and org slug.`);
  if (status === 404) throw new Error("Sentry: Not found — check organization/issue/project ID.");
  if (status === 429) throw new Error("Sentry: Rate limit exceeded. Add a Delay node.");
  throw new Error(`Sentry: ${status || "Error"} — ${msg}`);
}

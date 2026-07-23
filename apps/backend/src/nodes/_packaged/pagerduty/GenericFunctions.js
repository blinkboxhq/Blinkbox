/**
 * PagerDuty — shared helpers for all v1 action files.
 * The requester (`makeReq` output) is built by the backend entry
 * (apps/backend/.../pagerduty.node.js) with the resolved API token and passed
 * into the router, then into each handler as its second argument.
 * Event API ops call `axios` on EVENTS_URL directly (no auth token).
 */
import axios from "axios";

export const BASE_URL = "https://api.pagerduty.com";
export const EVENTS_URL = "https://events.pagerduty.com/v2/enqueue";

export const skip = (op, msg) => ({ success: false, error: `PagerDuty ${op}: ${msg}`, skipped: true });
export const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));

export const ref = (id, type) => ({ id, type });

export function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}
export function fromHeaders(config) {
  return config.fromEmail ? { From: config.fromEmail } : {};
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 120000,
    headers: {
      Authorization: `Token token=${token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
    },
  });
}

export function makeReq(token) {
  return { api: client(token) };
}

export function handleError(err) {
  if (err.message?.startsWith("PagerDuty")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  if (status === 400) throw new Error(`PagerDuty: Bad request — ${msg}`);
  if (status === 401) throw new Error(`PagerDuty: Authentication failed — check your API key.`);
  if (status === 402) throw new Error(`PagerDuty: Plan does not include this feature — ${msg}`);
  if (status === 403) throw new Error(`PagerDuty: Forbidden — ${msg}. Key may lack required permissions.`);
  if (status === 404) throw new Error(`PagerDuty: Not found — ${msg}. Check the ID.`);
  if (status === 409) throw new Error(`PagerDuty: Conflict — ${msg}`);
  if (status === 429) throw new Error(`PagerDuty: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`PagerDuty: ${status ?? "Network"} error — ${msg}`);
}

/**
 * ClickUp — shared primitives. Credential resolution, error mapping, the
 * due-date parser, and a thin request wrapper. ClickUp API v2.
 *
 * Auth: personal API token or OAuth access token, sent as a raw `Authorization`
 * header value (NOT `Bearer <token>`).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.clickup.com/api/v2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "ClickUp");
}

export function handleError(err) {
  if (err.message?.startsWith("ClickUp")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.err ?? err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`ClickUp: Auth failed — check your API token.`);
  if (status === 404) throw new Error(`ClickUp: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`ClickUp: Bad request — ${msg}`);
  if (status === 429) throw new Error("ClickUp: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`ClickUp: Server error (${status}) — try again later.`);
  throw new Error(`ClickUp: ${status ?? "Error"} — ${msg}`);
}

export function parseDueDate(val) {
  if (!val) return undefined;
  const n = Number(val);
  if (!isNaN(n)) return n;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.getTime();
  return undefined;
}

export function buildClient(token) {
  return { headers: { Authorization: token, "Content-Type": "application/json" } };
}

export async function req(client, method, path, { params, body, timeout = 15000 } = {}) {
  const { data } = await axios({
    method,
    url: `${BASE}${path}`,
    headers: client.headers,
    ...(params ? { params } : {}),
    ...(body !== undefined ? { data: body } : {}),
    timeout,
  });
  return data;
}

export function csvNumbers(val) {
  return String(val || "").split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n !== 0);
}

export function csvStrings(val) {
  return String(val || "").split(",").map(s => s.trim()).filter(Boolean);
}

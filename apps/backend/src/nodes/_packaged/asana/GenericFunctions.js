/**
 * Asana — shared primitives. Credential resolution, error mapping, a thin
 * request wrapper that unwraps the `{ data: ... }` envelope, and a common
 * opt_fields helper. Asana API v1.0.
 *
 * Auth: personal access token / OAuth token, sent as `Bearer <token>`.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://app.asana.com/api/1.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Asana");
}

export function buildClient(token) {
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" } };
}

export function handleError(err) {
  if (err.message?.startsWith("Asana")) throw err;
  const status = err.response?.status;
  const errors = err.response?.data?.errors;
  const msg = Array.isArray(errors) ? errors.map((e) => e.message).join(", ") : (err.response?.data?.message ?? err.message);
  if (status === 401 || status === 403) throw new Error(`Asana: Auth failed — check your personal access token.`);
  if (status === 404) throw new Error(`Asana: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Asana: Bad request — ${msg}`);
  if (status === 429) throw new Error("Asana: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`Asana: Server error (${status}) — try again later.`);
  throw new Error(`Asana: ${status ?? "Error"} — ${msg}`);
}

/**
 * Thin axios wrapper. Returns the unwrapped `data.data` payload (Asana wraps
 * every response in `{ data: ... }`); pass `raw:true` for the full body.
 */
export async function req(client, method, path, { params, body, timeout = 15000, raw = false } = {}) {
  const res = await axios({
    method,
    url: `${BASE}${path}`,
    headers: client.headers,
    ...(params ? { params } : {}),
    ...(body !== undefined ? { data: body } : {}),
    timeout,
  });
  return raw ? res.data : res.data.data;
}

export function csvGids(val) {
  return String(val || "").split(",").map(s => s.trim()).filter(Boolean);
}

export const TASK_FIELDS = "gid,name,completed,due_on,due_at,start_on,notes,permalink_url,assignee.name,projects.name,tags.name,created_at,modified_at,num_subtasks";
export const PROJECT_FIELDS = "gid,name,permalink_url,archived,color,notes,public,team.name,owner.name,created_at,current_status";

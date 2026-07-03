/**
 * Instagram — shared primitives. Token resolution, error mapping, and a thin
 * axios wrapper. Instagram Graph API v18.0.
 *
 * Handlers receive the raw OAuth access token (not a client object) — the token
 * is passed as the `access_token` query param on every call, matching the
 * original node's contract.
 *
 * Auth: Instagram OAuth token via getOAuthToken (auto-refreshes).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://graph.instagram.com/v18.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Instagram");
}

export function handleError(err) {
  if (err.message?.startsWith("Instagram")) throw err;
  const status = err.response?.status;
  const msg =
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message;
  const code = err.response?.data?.error?.code;
  if (status === 401 || code === 190) throw new Error("Instagram: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403 || code === 10 || code === 200) throw new Error(`Instagram: Permission denied — ${msg}. Ensure the app has the required scopes.`);
  if (status === 404) throw new Error(`Instagram: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Instagram: Bad request — ${msg}`);
  if (status === 429) throw new Error("Instagram: Rate limit exceeded. Retry later.");
  if (status === 422) throw new Error(`Instagram: Unprocessable content — ${msg}`);
  throw new Error(`Instagram failed: ${status || err.code} — ${err.message}`);
}

/** GET against the Graph API with `access_token` folded into params. */
export async function get(token, path, { params, timeout = 10000 } = {}) {
  const { data } = await axios.get(`${BASE}${path}`, {
    params: { access_token: token, ...(params || {}) },
    timeout,
  });
  return data;
}

/** POST against the Graph API. Instagram write endpoints carry args as query
 * params with a null body. */
export async function post(token, path, { params, body = null, timeout = 15000 } = {}) {
  const { data } = await axios.post(`${BASE}${path}`, body, {
    params: { access_token: token, ...(params || {}) },
    timeout,
  });
  return data;
}

export async function del(token, path, { params, timeout = 10000 } = {}) {
  const { data } = await axios.delete(`${BASE}${path}`, {
    params: { access_token: token, ...(params || {}) },
    timeout,
  });
  return data;
}

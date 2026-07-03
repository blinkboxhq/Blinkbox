/**
 * TikTok — shared primitives. Token resolution, error mapping, and a thin
 * POST-oriented axios wrapper (the TikTok v2 API is almost entirely POST).
 * Handlers receive the raw OAuth access token.
 *
 * Auth: TikTok OAuth2 token via getOAuthToken (auto-refreshes).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://open.tiktokapis.com/v2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "TikTok");
}

export function handleError(err) {
  if (err.message?.startsWith("TikTok")) throw err;
  const status = err.response?.status;
  const code = err.response?.data?.error?.code;
  const msg = err.response?.data?.error?.message || err.message;
  if (status === 401 || code === "access_token_invalid") throw new Error("TikTok: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403 || code === "permission_denied") throw new Error(`TikTok: Permission denied — ${msg}. Ensure your app has the required scopes (video.publish, video.list).`);
  if (status === 404) throw new Error(`TikTok: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`TikTok: Bad request — ${msg}`);
  if (status === 429 || code === "rate_limit_exceeded") throw new Error("TikTok: Rate limit exceeded. Retry later.");
  if (status === 422) throw new Error(`TikTok: Unprocessable request — ${msg}`);
  throw new Error(`TikTok failed: ${status || err.code} — ${err.message}`);
}

export function makeHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" };
}

/** POST a JSON body to a v2 endpoint. */
export async function post(token, path, body, { timeout = 15000, params } = {}) {
  const { data } = await axios.post(`${BASE}${path}`, body, {
    headers: makeHeaders(token),
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** GET a v2 endpoint (used by display fields queries). */
export async function get(token, path, { params, timeout = 15000 } = {}) {
  const { data } = await axios.get(`${BASE}${path}`, {
    headers: makeHeaders(token),
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

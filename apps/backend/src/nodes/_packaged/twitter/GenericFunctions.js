/**
 * Twitter / X — shared primitives. Token resolution, error mapping, and a thin
 * axios wrapper. Twitter API v2.
 *
 * Auth: Bearer token (read-only) OR OAuth 2.0 user token (read+write). For
 * writes (post, like, follow) an OAuth2 user-context token is required, not
 * just an app Bearer token.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.twitter.com/2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Twitter");
}

export function handleError(err) {
  if (err.message?.startsWith("Twitter")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.detail ?? err.response?.data?.errors?.[0]?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Twitter: Auth failed — ${detail}. Check your token and app permissions.`);
  if (status === 429) throw new Error("Twitter: Rate limit exceeded. Try again later.");
  if (status === 400) throw new Error(`Twitter: Bad request — ${detail}`);
  throw new Error(`Twitter: ${status ?? "Error"} — ${detail}`);
}

export function buildClient(token) {
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

/** Clamp a max_results value into the [min, max] window the endpoint allows. */
export function clampResults(val, min, max, def = 10) {
  return Math.min(Math.max(min, Number(val ?? def)), max);
}

export async function req(client, method, path, { params, body, timeout = 120000 } = {}) {
  const res = await axios({
    method,
    url: `${BASE}${path}`,
    headers: client.headers,
    ...(params ? { params } : {}),
    ...(body !== undefined ? { data: body } : {}),
    timeout,
  });
  return res.data;
}

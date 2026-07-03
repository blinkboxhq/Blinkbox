/**
 * YouTube — shared primitives. Token resolution, error mapping, and thin
 * axios wrappers over the YouTube Data API v3. Handlers receive the raw
 * OAuth access token (Google OAuth2 with YouTube scopes).
 *
 * Auth: Google OAuth2 token via getOAuthToken (auto-refreshes).
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const DATA_API = "https://www.googleapis.com/youtube/v3";
export const UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "YouTube");
}

export function handleError(err) {
  if (err.message?.startsWith("YouTube")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message || err.message;
  if (status === 401) throw new Error("YouTube: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`YouTube: Permission denied — ${msg}. Ensure the channel is verified and the API has the required scope.`);
  if (status === 404) throw new Error(`YouTube: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`YouTube: Bad request — ${msg}`);
  if (status === 409) throw new Error(`YouTube: Conflict — ${msg}`);
  if (status === 429) throw new Error("YouTube: Quota exceeded. The YouTube Data API daily quota has been reached.");
  if (status === 413) throw new Error("YouTube: File too large for this upload method.");
  throw new Error(`YouTube failed: ${status || err.code} — ${err.message}`);
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export function boundResults(val, def = 20) {
  const n = Number(val);
  if (isNaN(n) || n <= 0) return def;
  return Math.min(n, 50);
}

export function csvList(val) {
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  if (val == null || val === "") return [];
  return String(val).split(",").map((s) => s.trim()).filter(Boolean);
}

/** GET a Data API resource. Returns res.data. */
export async function get(token, path, { params, timeout = 15000 } = {}) {
  const { data } = await axios.get(`${DATA_API}${path}`, {
    headers: authHeaders(token),
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** POST a JSON body to a Data API resource. */
export async function post(token, path, body, { params, timeout = 15000 } = {}) {
  const { data } = await axios.post(`${DATA_API}${path}`, body, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** PUT a JSON body to a Data API resource. */
export async function put(token, path, body, { params, timeout = 15000 } = {}) {
  const { data } = await axios.put(`${DATA_API}${path}`, body, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** DELETE a Data API resource. */
export async function del(token, path, { params, timeout = 15000 } = {}) {
  const { data } = await axios.delete(`${DATA_API}${path}`, {
    headers: authHeaders(token),
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** Fetch a remote binary asset (video/thumbnail) into a Buffer. */
export async function fetchBinary(url, { timeout = 120000, maxBytes = 500 * 1024 * 1024 } = {}) {
  const resp = await axios.get(url, { responseType: "arraybuffer", timeout, maxContentLength: maxBytes });
  return Buffer.from(resp.data);
}

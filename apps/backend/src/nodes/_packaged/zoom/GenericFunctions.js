/**
 * ZOOM — shared primitives. Resolves the OAuth token, builds request headers
 * against the fixed api.zoom.us/v2 base, and maps errors verbatim. Handlers
 * receive (config, token).
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.zoom.us/v2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Zoom");
}

export function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  if (err.message.startsWith("Zoom")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Zoom: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`Zoom: Permission denied — ${msg}. Ensure the Zoom app has the required scopes (meeting:write, meeting:read).`);
  if (status === 404) throw new Error("Zoom: Meeting not found.");
  if (status === 400) throw new Error(`Zoom: Bad request — ${msg}`);
  if (status === 429) throw new Error("Zoom: Rate limit exceeded. Retry later.");
  throw new Error(`Zoom failed: ${status || err.code} — ${err.message}`);
}

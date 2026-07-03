/**
 * Twilio — shared helpers for all v1 action files.
 * getCreds() resolves the vault credential and splits the "AccountSID:AuthToken"
 * format into `{ accountSid, authToken }`; every handler is called
 * `(config, { accountSid, authToken })` — the same calling convention as the
 * original monolith. All API calls use HTTP Basic auth with the SID/token pair.
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.twilio.com/2010-04-01";

export async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Twilio");
  const [accountSid, authToken] = raw.split(":");
  if (!accountSid || !authToken) throw new Error("Twilio: Credential must be formatted as 'AccountSID:AuthToken'.");
  return { accountSid, authToken };
}

export function handleError(err) {
  if (err.message.startsWith("Twilio")) throw err;
  const status = err.response?.status;
  const code = err.response?.data?.code;
  const msg = err.response?.data?.message;
  if (status === 401) throw new Error("Twilio: Invalid Account SID or Auth Token.");
  if (status === 400) throw new Error(`Twilio: ${msg || "Bad request"} (code ${code})`);
  if (status === 429) throw new Error("Twilio: Rate limit exceeded. Retry later.");
  throw new Error(`Twilio failed: ${status || err.code} — ${err.message}`);
}

export function encodeForm(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export function makeReq(creds) {
  return creds;
}

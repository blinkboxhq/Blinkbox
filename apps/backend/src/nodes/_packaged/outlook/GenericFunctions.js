/**
 * OUTLOOK — shared primitives for the modular node. Microsoft Graph v1.0
 * client helpers, recipient parsing, and error mapping. Handlers receive
 * (config, client) where client = { headers, get, post, patch, del }.
 *
 * Import depth: this file lives at _packaged/outlook/, so utils are three
 * levels up. Production nixpacks build context is apps/backend only.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const GRAPH = "https://graph.microsoft.com/v1.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Outlook");
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function num(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a comma-separated address list into Graph recipient objects. */
export function buildRecipients(csv) {
  return String(csv || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

/** Build a Graph message body ({ contentType, content }). */
export function messageBody(content, isHtml) {
  return { contentType: isHtml ? "HTML" : "Text", content: content || "" };
}

/** Thin client bound to a bearer token. */
export function makeClient(headers) {
  const enc = encodeURIComponent;
  return {
    headers,
    enc,
    get: (path, params, opts = {}) =>
      axios.get(`${GRAPH}${path}`, { headers, params, timeout: 15000, ...opts }),
    post: (path, body, opts = {}) =>
      axios.post(`${GRAPH}${path}`, body, { headers, timeout: 20000, ...opts }),
    patch: (path, body, opts = {}) =>
      axios.patch(`${GRAPH}${path}`, body, { headers, timeout: 15000, ...opts }),
    del: (path, opts = {}) =>
      axios.delete(`${GRAPH}${path}`, { headers, timeout: 15000, ...opts }),
  };
}

/** Shape a raw Graph message into the node's compact message summary. */
export function mapMessage(m) {
  return {
    id: m.id,
    subject: m.subject,
    from: m.from?.emailAddress?.address,
    receivedDateTime: m.receivedDateTime,
    bodyPreview: m.bodyPreview,
    isRead: m.isRead,
  };
}

export function mapEvent(e) {
  return {
    id: e.id,
    subject: e.subject,
    start: e.start?.dateTime,
    end: e.end?.dateTime,
    location: e.location?.displayName,
    organizer: e.organizer?.emailAddress?.address,
    webLink: e.webLink,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Outlook")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`Outlook: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Outlook: Insufficient permissions — ${msg}. Ensure the required Graph scopes are granted.`);
  if (status === 404) throw new Error(`Outlook: Resource not found — ${msg}`);
  if (status === 429) throw new Error(`Outlook: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Outlook: ${status ?? "Network"} error — ${msg}`);
}

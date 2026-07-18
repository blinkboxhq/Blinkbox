/**
 * TEAMS — shared primitives. Microsoft Graph client, token resolution,
 * body/attachment builders, response mappers and the verbatim error mapper.
 * Handlers receive (config, client) where client wraps the Graph base URL.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const GRAPH = "https://graph.microsoft.com/v1.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Teams");
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : fallback;
}

/** Parse a JSON-or-object field; throws a Teams-prefixed error on invalid JSON. */
export function parseJson(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Teams: '${fieldName}' is not valid JSON.`);
  }
}

/** Comma-separated UPNs → attendee participant objects. */
export function buildAttendees(raw, role = "attendee") {
  return String(raw || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((upn) => ({ upn, role }));
}

/** { contentType, content } message body — html when isHtml truthy. */
export function messageBody(content, isHtml) {
  return { contentType: isHtml ? "html" : "text", content: content ?? "" };
}

export function mapChannel(c) {
  return {
    id: c.id,
    displayName: c.displayName,
    description: c.description,
    membershipType: c.membershipType,
    webUrl: c.webUrl,
  };
}

export function mapTeam(t) {
  return {
    id: t.id,
    displayName: t.displayName,
    description: t.description,
    visibility: t.visibility,
  };
}

export function mapMessage(m) {
  return {
    id: m.id,
    createdDateTime: m.createdDateTime,
    lastModifiedDateTime: m.lastModifiedDateTime,
    from: m.from?.user?.displayName ?? m.from?.application?.displayName,
    body: m.body?.content,
    webUrl: m.webUrl,
  };
}

/** Bind get/post/patch/del to the Graph base URL with sane timeouts. */
export function makeClient(headers) {
  const enc = encodeURIComponent;
  const req = (method, path, data, timeout) =>
    axios({ method, url: `${GRAPH}${path}`, data, headers, timeout: timeout ?? 20000 });
  return {
    headers,
    enc,
    get: (path, timeout) => req("get", path, undefined, timeout ?? 15000),
    post: (path, data, timeout) => req("post", path, data, timeout),
    patch: (path, data, timeout) => req("patch", path, data, timeout),
    del: (path, timeout) => req("delete", path, undefined, timeout),
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Teams")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`Teams: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Teams: Insufficient permissions — ${msg}. Ensure Teams Graph scopes are granted.`);
  if (status === 404) throw new Error(`Teams: Resource not found — ${msg}. Check teamId and channelId values.`);
  if (status === 429) throw new Error(`Teams: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Teams: ${status ?? "Network"} error — ${msg}`);
}

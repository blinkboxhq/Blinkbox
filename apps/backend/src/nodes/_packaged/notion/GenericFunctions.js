/**
 * Notion — shared helpers for all v1 resource files.
 * Handlers receive `(config, token)` where token is the Notion Internal
 * Integration Token; makeReq(token) is the identity passthrough the slim
 * entry uses to preserve that calling convention.
 */
export const BASE = "https://api.notion.com/v1";
export const NOTION_VERSION = "2022-06-28";

export function handleError(err) {
  if (err.message.startsWith("Notion")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message;
  if (status === 401) throw new Error("Notion: Invalid integration token.");
  if (status === 403) throw new Error(`Notion: Missing permissions — ${msg || "check your integration has access to the page/database."}`);
  if (status === 404) throw new Error("Notion: Page or database not found. Ensure integration is added to that page.");
  if (status === 400) throw new Error(`Notion: Bad request — ${msg || err.message}`);
  if (status === 429) throw new Error("Notion: Rate limit exceeded. Retry later.");
  throw new Error(`Notion failed: ${status || err.code} — ${err.message}`);
}

export function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

export function stripId(id) {
  // Accept both raw UUID and Notion page URLs
  return String(id).replace(/^.*\//, "").replace(/-/g, "").replace(/\?.*$/, "");
}

export function parseJSON(raw, op, field) {
  if (raw == null || typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { throw new Error(`Notion ${op}: '${field}' must be valid JSON.`); }
}

// Notion passes the resolved integration token straight through to handlers.
export function makeReq(token) {
  return token;
}

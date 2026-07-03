/**
 * Airtable — shared primitives. Base URL, error mapping, per-request headers,
 * and the record-endpoint URL builder. Extracted verbatim from the monolith.
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE_URL = "https://api.airtable.com/v0";
export const MAX_RECORDS_LIMIT = 1000;
export const BULK_LIMIT = 10;

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Airtable");
}

export function handleError(err) {
  if (err.message.startsWith("Airtable")) throw err;
  if (err.response?.status === 401) throw new Error("Airtable: Invalid token or insufficient permissions.");
  if (err.response?.status === 404) throw new Error("Airtable: Base or table not found. Check baseId and tableName.");
  if (err.response?.status === 422) {
    const detail = err.response?.data?.error?.message || JSON.stringify(err.response?.data);
    throw new Error(`Airtable: Validation error — ${detail}`);
  }
  if (err.response?.status === 429) throw new Error("Airtable: Rate limit exceeded (5 req/s). Retry later.");
  throw new Error(`Airtable failed: ${err.response?.status || err.code} — ${err.message}`);
}

export function tableUrl(baseId, tableName) {
  return `${BASE_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
}

export function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function makeReq(token) {
  return token;
}

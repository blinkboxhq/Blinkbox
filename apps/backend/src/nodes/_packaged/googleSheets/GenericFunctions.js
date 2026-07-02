/**
 * Google Sheets — shared helpers: API base, auth headers, spreadsheet
 * batchUpdate primitive, error normalization.
 */
import axios from "axios";

export const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export function handleError(err) {
  if (err.message?.startsWith("Google Sheets")) throw err;
  const status = err.response?.status;
  const apiMsg = err.response?.data?.error?.message || err.message;
  if (status === 401 || status === 403) throw new Error(`Google Sheets: Auth failed (${status}) — ${apiMsg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`Google Sheets: Spreadsheet not found — ${apiMsg}. Check the spreadsheetId.`);
  if (status === 400) throw new Error(`Google Sheets: Bad request — ${apiMsg}`);
  if (status === 429) throw new Error("Google Sheets: Rate limit exceeded (quota). Reduce request frequency or enable retry.");
  if (status >= 500) throw new Error(`Google Sheets: Google server error (${status}) — ${apiMsg}. Retry later.`);
  throw new Error(`Google Sheets: ${status || err.code || "Error"} — ${apiMsg}`);
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function batchUpdate(spreadsheetId, requests, token) {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
  const response = await axios.post(url, { requests }, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    timeout: 20000,
  });
  return response.data;
}

export function makeReq(token) {
  return token;
}

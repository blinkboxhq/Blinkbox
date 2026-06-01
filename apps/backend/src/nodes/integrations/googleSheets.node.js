/**
 * GOOGLE SHEETS NODE
 *
 * Operations:
 *   readRange   — Read a range of cells (default)
 *   writeRange  — Write values to a range (overwrites)
 *   appendRow   — Append rows after the last row with data
 *   clearRange  — Clear values in a range
 *   getSheet    — Get spreadsheet metadata (title, sheets list)
 *
 * Auth: Google OAuth2 credential (access_token stored in vault)
 * Config:
 *   credentialId  — Vault reference to Google OAuth token
 *   spreadsheetId — The spreadsheet ID from the URL
 *   range         — A1 notation, e.g. "Sheet1!A1:D10"
 *   values        — 2D array for writeRange / appendRow
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Google Sheets");
}

function handleError(err) {
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

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function opReadRange(config, token) {
  if (!config.range) return { success: false, error: "Google Sheets readRange: 'range' is required.", skipped: true };
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`;
  const response = await axios.get(url, {
    headers: authHeaders(token),
    params: { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" },
    timeout: 15000,
  });
  const rows = response.data.values || [];
  return { values: rows, rowCount: rows.length, range: response.data.range };
}

async function opWriteRange(config, token) {
  if (!config.range) return { success: false, error: "Google Sheets writeRange: 'range' is required.", skipped: true };
  const values = Array.isArray(config.values) ? config.values : (() => { try { return JSON.parse(config.values); } catch { throw new Error("Google Sheets writeRange: 'values' must be valid JSON array."); } })();
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`;
  const response = await axios.put(url, {
    range: config.range,
    majorDimension: "ROWS",
    values,
  }, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    params: { valueInputOption: config.rawInput ? "RAW" : "USER_ENTERED" },
    timeout: 15000,
  });
  return {
    updatedRange: response.data.updatedRange,
    updatedRows: response.data.updatedRows,
    updatedColumns: response.data.updatedColumns,
    updatedCells: response.data.updatedCells,
  };
}

async function opAppendRow(config, token) {
  if (!config.range) return { success: false, error: "Google Sheets appendRow: 'range' is required (e.g. Sheet1!A:Z).", skipped: true };
  const values = Array.isArray(config.values) ? config.values : (() => { try { return JSON.parse(config.values); } catch { throw new Error("Google Sheets appendRow: 'values' must be valid JSON array."); } })();
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}:append`;
  const response = await axios.post(url, {
    majorDimension: "ROWS",
    values: Array.isArray(values[0]) ? values : [values],
  }, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    params: { valueInputOption: config.rawInput ? "RAW" : "USER_ENTERED", insertDataOption: "INSERT_ROWS" },
    timeout: 15000,
  });
  return {
    updatedRange: response.data.updates?.updatedRange,
    updatedRows: response.data.updates?.updatedRows,
    updatedCells: response.data.updates?.updatedCells,
  };
}

async function opClearRange(config, token) {
  if (!config.range) return { success: false, error: "Google Sheets clearRange: 'range' is required.", skipped: true };
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}:clear`;
  const response = await axios.post(url, {}, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { clearedRange: response.data.clearedRange };
}

async function opGetSheet(config, token) {
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}`;
  const response = await axios.get(url, {
    headers: authHeaders(token),
    params: { fields: "spreadsheetId,properties.title,sheets.properties" },
    timeout: 15000,
  });
  return {
    spreadsheetId: response.data.spreadsheetId,
    title: response.data.properties?.title,
    sheets: (response.data.sheets || []).map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      index: s.properties.index,
      rowCount: s.properties.gridProperties?.rowCount,
      columnCount: s.properties.gridProperties?.columnCount,
    })),
  };
}

const OPERATIONS = {
  readRange: opReadRange,
  writeRange: opWriteRange,
  appendRow: opAppendRow,
  clearRange: opClearRange,
  getSheet: opGetSheet,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "readRange";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Google Sheets: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
    if (!config.spreadsheetId) return { success: false, error: "Google Sheets: 'spreadsheetId' is required.", skipped: true };
    if (!config.credentialId) return { success: false, error: "Google Sheets: No credential selected.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Google Sheets: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

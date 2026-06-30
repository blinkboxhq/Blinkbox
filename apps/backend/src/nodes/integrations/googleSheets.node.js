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

async function sheetIdForTitle(spreadsheetId, sheetTitle, token) {
  const meta = await opGetSheet({ spreadsheetId }, token);
  const match = (meta.sheets || []).find((s) => s.title === sheetTitle);
  if (!match) throw new Error(`Google Sheets: tab "${sheetTitle}" not found in spreadsheet.`);
  return match.sheetId;
}

async function opLookupRow(config, token) {
  if (!config.range) return { success: false, error: "Google Sheets lookupRow: 'range' is required (e.g. Sheet1!A:Z).", skipped: true };
  if (!config.lookupColumn) return { success: false, error: "Google Sheets lookupRow: 'lookupColumn' is required.", skipped: true };
  if (config.lookupValue === undefined || config.lookupValue === null)
    return { success: false, error: "Google Sheets lookupRow: 'lookupValue' is required.", skipped: true };
  const { values } = await opReadRange(config, token);
  if (!values.length) return { found: false, row: null, rowNumber: null };
  const header = values[0];
  const colIdx = header.findIndex((h) => String(h).trim() === String(config.lookupColumn).trim());
  if (colIdx === -1) throw new Error(`Google Sheets lookupRow: column "${config.lookupColumn}" not found in header row.`);
  const target = String(config.lookupValue);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colIdx]) === target) {
      const obj = {};
      header.forEach((h, j) => { obj[h] = values[i][j]; });
      return { found: true, row: obj, rowNumber: i + 1, raw: values[i] };
    }
  }
  return { found: false, row: null, rowNumber: null };
}

async function opUpdateRow(config, token) {
  const found = await opLookupRow(config, token);
  if (found.skipped) return found;
  if (!found.found) return { success: false, error: "Google Sheets updateRow: no row matched the lookup value.", skipped: true };
  const sheetName = String(config.range).split("!")[0];
  const writeRange = `${sheetName}!A${found.rowNumber}`;
  return opWriteRange({ ...config, range: writeRange }, token);
}

async function opBatchGet(config, token) {
  let ranges = config.ranges;
  if (typeof ranges === "string") ranges = ranges.split(",").map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(ranges) || ranges.length === 0)
    return { success: false, error: "Google Sheets batchGet: 'ranges' must be a non-empty list.", skipped: true };
  const url = `${BASE}/${encodeURIComponent(config.spreadsheetId)}/values:batchGet`;
  const params = new URLSearchParams();
  ranges.forEach((r) => params.append("ranges", r));
  params.append("valueRenderOption", "UNFORMATTED_VALUE");
  const response = await axios.get(`${url}?${params.toString()}`, { headers: authHeaders(token), timeout: 20000 });
  return { valueRanges: (response.data.valueRanges || []).map((vr) => ({ range: vr.range, values: vr.values || [] })) };
}

async function batchUpdate(spreadsheetId, requests, token) {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
  const response = await axios.post(url, { requests }, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    timeout: 20000,
  });
  return response.data;
}

async function opInsertRow(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets insertRow: 'sheetName' is required.", skipped: true };
  const sheetId = await sheetIdForTitle(config.spreadsheetId, config.sheetName, token);
  const startIndex = config.rowIndex != null ? Number(config.rowIndex) - 1 : 1;
  await batchUpdate(config.spreadsheetId, [{
    insertDimension: {
      range: { sheetId, dimension: "ROWS", startIndex: Math.max(startIndex, 0), endIndex: Math.max(startIndex, 0) + (Number(config.rowCount) || 1) },
      inheritFromBefore: startIndex > 0,
    },
  }], token);
  if (config.values) {
    const writeRange = `${config.sheetName}!A${startIndex + 1}`;
    await opWriteRange({ ...config, range: writeRange }, token);
  }
  return { success: true, inserted: Number(config.rowCount) || 1, sheetName: config.sheetName };
}

async function opDeleteRow(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets deleteRow: 'sheetName' is required.", skipped: true };
  if (config.rowIndex == null) return { success: false, error: "Google Sheets deleteRow: 'rowIndex' (1-based) is required.", skipped: true };
  const sheetId = await sheetIdForTitle(config.spreadsheetId, config.sheetName, token);
  const startIndex = Number(config.rowIndex) - 1;
  await batchUpdate(config.spreadsheetId, [{
    deleteDimension: {
      range: { sheetId, dimension: "ROWS", startIndex: Math.max(startIndex, 0), endIndex: Math.max(startIndex, 0) + (Number(config.rowCount) || 1) },
    },
  }], token);
  return { success: true, deleted: Number(config.rowCount) || 1, sheetName: config.sheetName };
}

async function opCreateSpreadsheet(config, token) {
  if (!config.title) return { success: false, error: "Google Sheets createSpreadsheet: 'title' is required.", skipped: true };
  const body = { properties: { title: config.title } };
  if (config.sheetTitles) {
    let titles = config.sheetTitles;
    if (typeof titles === "string") titles = titles.split(",").map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(titles) && titles.length) body.sheets = titles.map((t) => ({ properties: { title: t } }));
  }
  const response = await axios.post(BASE, body, {
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { spreadsheetId: response.data.spreadsheetId, spreadsheetUrl: response.data.spreadsheetUrl, title: response.data.properties?.title };
}

async function opCreateSheet(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets createSheet: 'sheetName' is required.", skipped: true };
  const data = await batchUpdate(config.spreadsheetId, [{ addSheet: { properties: { title: config.sheetName } } }], token);
  const props = data.replies?.[0]?.addSheet?.properties;
  return { sheetId: props?.sheetId, title: props?.title };
}

async function opDeleteSheet(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets deleteSheet: 'sheetName' is required.", skipped: true };
  const sheetId = await sheetIdForTitle(config.spreadsheetId, config.sheetName, token);
  await batchUpdate(config.spreadsheetId, [{ deleteSheet: { sheetId } }], token);
  return { success: true, deletedSheet: config.sheetName };
}

async function opRenameSheet(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets renameSheet: 'sheetName' is required.", skipped: true };
  if (!config.newSheetName) return { success: false, error: "Google Sheets renameSheet: 'newSheetName' is required.", skipped: true };
  const sheetId = await sheetIdForTitle(config.spreadsheetId, config.sheetName, token);
  await batchUpdate(config.spreadsheetId, [{
    updateSheetProperties: { properties: { sheetId, title: config.newSheetName }, fields: "title" },
  }], token);
  return { success: true, sheetId, title: config.newSheetName };
}

async function opDuplicateSheet(config, token) {
  if (!config.sheetName) return { success: false, error: "Google Sheets duplicateSheet: 'sheetName' is required.", skipped: true };
  const sheetId = await sheetIdForTitle(config.spreadsheetId, config.sheetName, token);
  const data = await batchUpdate(config.spreadsheetId, [{
    duplicateSheet: { sourceSheetId: sheetId, newSheetName: config.newSheetName || `${config.sheetName} Copy` },
  }], token);
  const props = data.replies?.[0]?.duplicateSheet?.properties;
  return { sheetId: props?.sheetId, title: props?.title };
}

const OPERATIONS = {
  readRange: opReadRange,
  writeRange: opWriteRange,
  appendRow: opAppendRow,
  clearRange: opClearRange,
  getSheet: opGetSheet,
  lookupRow: opLookupRow,
  updateRow: opUpdateRow,
  batchGet: opBatchGet,
  insertRow: opInsertRow,
  deleteRow: opDeleteRow,
  createSpreadsheet: opCreateSpreadsheet,
  createSheet: opCreateSheet,
  deleteSheet: opDeleteSheet,
  renameSheet: opRenameSheet,
  duplicateSheet: opDuplicateSheet,
};

const NO_SPREADSHEET_OPS = new Set(["createSpreadsheet"]);

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "readRange";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Google Sheets: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
    if (!NO_SPREADSHEET_OPS.has(operation) && !config.spreadsheetId) return { success: false, error: "Google Sheets: 'spreadsheetId' is required.", skipped: true };
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

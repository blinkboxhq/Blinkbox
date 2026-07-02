/**
 * Google Sheets — cell value operations: read, write, append, clear, batchGet.
 * Handlers receive `(config, token)`. opReadRange/opWriteRange are exported
 * individually because row-level operations compose them.
 */
import axios from "axios";
import { BASE, authHeaders } from "../GenericFunctions.js";

export async function opReadRange(config, token) {
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

export async function opWriteRange(config, token) {
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

export const valueOperations = {
  readRange: opReadRange,
  writeRange: opWriteRange,
  appendRow: opAppendRow,
  clearRange: opClearRange,
  batchGet: opBatchGet,
};

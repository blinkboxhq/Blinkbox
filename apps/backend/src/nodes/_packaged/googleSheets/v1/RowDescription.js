/**
 * Google Sheets — row-level operations: lookup, update, insert, delete.
 * Handlers receive `(config, token)` and compose value/sheet primitives.
 */
import { batchUpdate } from "../GenericFunctions.js";
import { opReadRange, opWriteRange } from "./ValueDescription.js";
import { sheetIdForTitle } from "./SheetDescription.js";

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

export const rowOperations = {
  lookupRow: opLookupRow,
  updateRow: opUpdateRow,
  insertRow: opInsertRow,
  deleteRow: opDeleteRow,
};

/**
 * Google Sheets — spreadsheet & sheet-tab operations: metadata, create
 * spreadsheet, create/delete/rename/duplicate tabs. Handlers receive
 * `(config, token)`. sheetIdForTitle is exported for row-level operations.
 */
import axios from "axios";
import { BASE, authHeaders, batchUpdate } from "../GenericFunctions.js";

export async function opGetSheet(config, token) {
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

export async function sheetIdForTitle(spreadsheetId, sheetTitle, token) {
  const meta = await opGetSheet({ spreadsheetId }, token);
  const match = (meta.sheets || []).find((s) => s.title === sheetTitle);
  if (!match) throw new Error(`Google Sheets: tab "${sheetTitle}" not found in spreadsheet.`);
  return match.sheetId;
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

export const sheetOperations = {
  getSheet: opGetSheet,
  createSpreadsheet: opCreateSpreadsheet,
  createSheet: opCreateSheet,
  deleteSheet: opDeleteSheet,
  renameSheet: opRenameSheet,
  duplicateSheet: opDuplicateSheet,
};

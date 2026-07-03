/**
 * Airtable — schema/metadata operations against the meta API: listBases,
 * listTables, createTable, createField. These hit /v0/meta/... rather than the
 * record endpoints, so they don't need baseId/tableName the same way.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers } from "../GenericFunctions.js";

async function opListBases(config, token) {
  const response = await axios.get("https://api.airtable.com/v0/meta/bases", { headers: headers(token), timeout: 15000 });
  return { bases: (response.data.bases || []).map((b) => ({ id: b.id, name: b.name, permissionLevel: b.permissionLevel })) };
}

async function opListTables(config, token) {
  if (!config.baseId) return { success: false, error: "Airtable listTables: 'baseId' is required.", skipped: true };
  const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${encodeURIComponent(config.baseId)}/tables`, { headers: headers(token), timeout: 15000 });
  return {
    tables: (response.data.tables || []).map((t) => ({
      id: t.id, name: t.name, primaryFieldId: t.primaryFieldId,
      fields: (t.fields || []).map((f) => ({ id: f.id, name: f.name, type: f.type })),
    })),
  };
}

async function opCreateTable(config, token) {
  if (!config.baseId) return { success: false, error: "Airtable createTable: 'baseId' is required.", skipped: true };
  if (!config.newTableName) return { success: false, error: "Airtable createTable: 'newTableName' is required.", skipped: true };
  let tableFields = config.tableFields;
  if (typeof tableFields === "string") {
    try { tableFields = JSON.parse(tableFields); } catch { throw new Error("Airtable createTable: 'tableFields' is not valid JSON."); }
  }
  if (!Array.isArray(tableFields) || tableFields.length === 0)
    tableFields = [{ name: "Name", type: "singleLineText" }];
  const body = { name: config.newTableName, fields: tableFields };
  if (config.tableDescription) body.description = config.tableDescription;
  const response = await axios.post(`https://api.airtable.com/v0/meta/bases/${encodeURIComponent(config.baseId)}/tables`, body, { headers: headers(token), timeout: 15000 });
  return { id: response.data.id, name: response.data.name };
}

async function opCreateField(config, token) {
  if (!config.baseId) return { success: false, error: "Airtable createField: 'baseId' is required.", skipped: true };
  if (!config.tableId) return { success: false, error: "Airtable createField: 'tableId' is required.", skipped: true };
  if (!config.fieldName) return { success: false, error: "Airtable createField: 'fieldName' is required.", skipped: true };
  const body = { name: config.fieldName, type: config.fieldType || "singleLineText" };
  if (config.fieldOptions && typeof config.fieldOptions === "object") body.options = config.fieldOptions;
  const response = await axios.post(`https://api.airtable.com/v0/meta/bases/${encodeURIComponent(config.baseId)}/tables/${encodeURIComponent(config.tableId)}/fields`, body, { headers: headers(token), timeout: 15000 });
  return { id: response.data.id, name: response.data.name, type: response.data.type };
}

export const metaOperations = {
  listBases: opListBases,
  listTables: opListTables,
  createTable: opCreateTable,
  createField: opCreateField,
};

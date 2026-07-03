/**
 * Airtable — single-record operations: create, read/list, update, delete,
 * getRecord, search. `opRead` is exported individually because `opSearch`
 * composes it. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { tableUrl, headers, MAX_RECORDS_LIMIT } from "../GenericFunctions.js";

async function opCreate(config, token) {
  const url = tableUrl(config.baseId, config.tableName);
  const response = await axios.post(url,
    { fields: config.fields || {}, typecast: config.typecast !== false },
    { headers: headers(token), timeout: 15000 },
  );
  return { id: response.data.id, fields: response.data.fields, createdTime: response.data.createdTime };
}

export async function opRead(config, token) {
  const url = tableUrl(config.baseId, config.tableName);
  const params = { maxRecords: Math.min(config.maxRecords || 100, MAX_RECORDS_LIMIT) };
  if (config.filterFormula) params.filterByFormula = config.filterFormula;
  if (config.view) params.view = config.view;
  if (config.sort && Array.isArray(config.sort)) {
    config.sort.forEach((s, i) => {
      params[`sort[${i}][field]`] = s.field;
      params[`sort[${i}][direction]`] = s.direction || "asc";
    });
  }

  const response = await axios.get(url, { headers: headers(token), params, timeout: 30000 });
  return {
    records: (response.data.records || []).map((r) => ({ id: r.id, fields: r.fields, createdTime: r.createdTime })),
    totalRecords: response.data.records?.length || 0,
    offset: response.data.offset || null,
  };
}

async function opUpdate(config, token) {
  if (!config.recordId) return { success: false, error: "Airtable update: 'recordId' is required — configure this field.", skipped: true };
  const url = `${tableUrl(config.baseId, config.tableName)}/${encodeURIComponent(config.recordId)}`;
  const response = await axios.patch(url,
    { fields: config.fields || {}, typecast: config.typecast !== false },
    { headers: headers(token), timeout: 15000 },
  );
  return { id: response.data.id, fields: response.data.fields };
}

async function opDelete(config, token) {
  if (!config.recordId) return { success: false, error: "Airtable delete: 'recordId' is required — configure this field.", skipped: true };
  const url = `${tableUrl(config.baseId, config.tableName)}/${encodeURIComponent(config.recordId)}`;
  const response = await axios.delete(url, { headers: headers(token), timeout: 15000 });
  return { id: response.data.id, deleted: response.data.deleted };
}

async function opGetRecord(config, token) {
  if (!config.recordId) return { success: false, error: "Airtable getRecord: 'recordId' is required — configure this field.", skipped: true };
  const url = `${tableUrl(config.baseId, config.tableName)}/${encodeURIComponent(config.recordId)}`;
  const response = await axios.get(url, { headers: headers(token), timeout: 15000 });
  return { id: response.data.id, fields: response.data.fields, createdTime: response.data.createdTime };
}

async function opSearch(config, token) {
  if (!config.searchField) return { success: false, error: "Airtable search: 'searchField' is required — configure this field.", skipped: true };
  if (config.searchValue === undefined || config.searchValue === null)
    return { success: false, error: "Airtable search: 'searchValue' is required — configure this field.", skipped: true };

  // Build a filterByFormula for the search
  const escaped = String(config.searchValue).replace(/'/g, "\\'");
  const formula = `{${config.searchField}} = '${escaped}'`;

  return opRead({ ...config, filterFormula: formula, maxRecords: config.maxRecords || 10 }, token);
}

export const recordOperations = {
  create: opCreate,
  read: opRead,
  update: opUpdate,
  delete: opDelete,
  getRecord: opGetRecord,
  search: opSearch,
};

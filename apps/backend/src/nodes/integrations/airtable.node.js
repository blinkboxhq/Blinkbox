/**
 * AIRTABLE NODE
 *
 * Operations:
 *   create      — Create a single record (default)
 *   read        — List/filter records
 *   update      — Update a single record
 *   delete      — Delete a single record
 *   getRecord   — Fetch a single record by ID
 *   search      — Search records by field value (convenience wrapper)
 *   bulkCreate  — Create up to 10 records in one API call
 *   bulkUpdate  — Update up to 10 records in one API call
 *
 * Config:
 *   credentialId — Vault reference to Airtable Personal Access Token
 *   baseId       — Airtable Base ID (appXXXXXXXXXXXXXX)
 *   tableName    — Table name or ID
 *   operation    — one of the above (default: "create")
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.airtable.com/v0";
const MAX_RECORDS_LIMIT = 1000;
const BULK_LIMIT = 10;

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Airtable");
}

function handleError(err) {
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

function tableUrl(baseId, tableName) {
  return `${BASE_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function opCreate(config, token) {
  const url = tableUrl(config.baseId, config.tableName);
  const response = await axios.post(url,
    { fields: config.fields || {}, typecast: config.typecast !== false },
    { headers: headers(token), timeout: 15000 },
  );
  return { id: response.data.id, fields: response.data.fields, createdTime: response.data.createdTime };
}

async function opRead(config, token) {
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

async function opBulkCreate(config, token) {
  const records = config.records;
  if (!Array.isArray(records) || records.length === 0)
    return { success: false, error: "Airtable bulkCreate: 'records' must be a non-empty array of field objects — configure this field.", skipped: true };
  if (records.length > BULK_LIMIT)
    return { success: false, error: `Airtable bulkCreate: maximum ${BULK_LIMIT} records per call. Split into batches.`, skipped: true };

  const url = tableUrl(config.baseId, config.tableName);
  const response = await axios.post(url,
    {
      records: records.map((r) => ({ fields: r.fields || r })),
      typecast: config.typecast !== false,
    },
    { headers: headers(token), timeout: 20000 },
  );
  return {
    records: (response.data.records || []).map((r) => ({ id: r.id, fields: r.fields, createdTime: r.createdTime })),
    created: response.data.records?.length || 0,
  };
}

async function opBulkUpdate(config, token) {
  const records = config.records;
  if (!Array.isArray(records) || records.length === 0)
    throw new Error("Airtable bulkUpdate: 'records' must be a non-empty array of { id, fields } objects.");
  if (records.length > BULK_LIMIT)
    throw new Error(`Airtable bulkUpdate: maximum ${BULK_LIMIT} records per call. Split into batches.`);
  if (records.some((r) => !r.id))
    throw new Error("Airtable bulkUpdate: every record in 'records' must have an 'id' field.");

  const url = tableUrl(config.baseId, config.tableName);
  const response = await axios.patch(url,
    {
      records: records.map((r) => ({ id: r.id, fields: r.fields || {} })),
      typecast: config.typecast !== false,
    },
    { headers: headers(token), timeout: 20000 },
  );
  return {
    records: (response.data.records || []).map((r) => ({ id: r.id, fields: r.fields })),
    updated: response.data.records?.length || 0,
  };
}

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  create: opCreate,
  read: opRead,
  update: opUpdate,
  delete: opDelete,
  getRecord: opGetRecord,
  search: opSearch,
  bulkCreate: opBulkCreate,
  bulkUpdate: opBulkUpdate,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "create";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Airtable: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.baseId) return { success: false, error: "Airtable: 'baseId' is required — configure this field.", skipped: true };
    if (!config.tableName) return { success: false, error: "Airtable: 'tableName' is required — configure this field.", skipped: true };

    const token = await getToken(config.credentialId, context.workspaceId);

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

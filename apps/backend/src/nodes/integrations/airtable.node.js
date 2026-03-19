/**
 * AIRTABLE NODE
 *
 * Full CRUD against the Airtable REST API with standardized field mapping.
 * Users visually map upstream JSON fields into Airtable's `fields: {}` shape
 * via the Data Mapper pattern on the frontend.
 *
 * Config:
 *   credentialId — Vault reference to Airtable Personal Access Token (type: "bearer")
 *   baseId       — Airtable Base ID (e.g., "appXXXXXXXXXXXXXX")
 *   tableName    — Table name or ID
 *   action       — "create" | "read" | "update" | "delete" (default: "create")
 *
 *   --- Create / Update ---
 *   fields       — Object: the fields to set (key = column name, value = cell value)
 *                  Already expression-resolved — upstream data is mapped in by the engine.
 *   recordId     — Required for "update" and "delete" actions
 *   typecast     — Auto-convert strings to correct field types (default: true)
 *
 *   --- Read ---
 *   maxRecords   — Max records to return (default: 100, max: 1000)
 *   filterFormula — Airtable formula filter (e.g., "{Status} = 'Active'")
 *   sort         — Array of { field, direction } (direction: "asc" | "desc")
 *   view         — View name to read from
 *
 * Output:
 *   create → { id, fields, createdTime }
 *   read   → { records: [{ id, fields, createdTime }], totalRecords }
 *   update → { id, fields }
 *   delete → { id, deleted: true }
 */

import axios from "axios";
import Credential from "../../models/credential.model.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://api.airtable.com/v0";
const MAX_RECORDS_LIMIT = 1000;

export default {
  async run(config, input, context = {}) {
    const {
      credentialId,
      baseId,
      tableName,
      action = "create",
      fields = {},
      recordId,
      typecast = true,
      maxRecords = 100,
      filterFormula,
      sort,
      view,
    } = config;

    if (!baseId) throw new Error("Airtable: 'baseId' is required.");
    if (!tableName) throw new Error("Airtable: 'tableName' is required.");
    if (!credentialId)
      throw new Error("Airtable: 'credentialId' is required. Add your Airtable token to the Vault.");

    // Vault: decrypt Personal Access Token
    const query = { _id: credentialId };
    if (context.workspaceId) query.workspaceId = context.workspaceId;
    const cred = await Credential.findOne(query);
    if (!cred) throw new Error("Airtable: Credential not found in Vault.");

    const token = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const tableUrl = `${BASE_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;

    try {
      switch (action) {
        case "create":
          return await createRecord(tableUrl, headers, fields, typecast);
        case "read":
          return await readRecords(tableUrl, headers, { maxRecords, filterFormula, sort, view });
        case "update":
          if (!recordId) throw new Error("Airtable: 'recordId' is required for update.");
          return await updateRecord(tableUrl, headers, recordId, fields, typecast);
        case "delete":
          if (!recordId) throw new Error("Airtable: 'recordId' is required for delete.");
          return await deleteRecord(tableUrl, headers, recordId);
        default:
          throw new Error(`Airtable: Unknown action '${action}'. Use create, read, update, or delete.`);
      }
    } catch (err) {
      if (err.message.startsWith("Airtable:")) throw err;
      if (err.response?.status === 401) throw new Error("Airtable: Invalid token or insufficient permissions.");
      if (err.response?.status === 404) throw new Error("Airtable: Base or table not found. Check baseId and tableName.");
      if (err.response?.status === 422) {
        const detail = err.response?.data?.error?.message || JSON.stringify(err.response?.data);
        throw new Error(`Airtable: Validation error — ${detail}`);
      }
      if (err.response?.status === 429) throw new Error("Airtable: Rate limit exceeded (5 req/s). Retry later.");
      throw new Error(`Airtable failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};

async function createRecord(tableUrl, headers, fields, typecast) {
  const response = await axios.post(
    tableUrl,
    { fields, typecast },
    { headers, timeout: 15000 },
  );
  return {
    id: response.data.id,
    fields: response.data.fields,
    createdTime: response.data.createdTime,
  };
}

async function readRecords(tableUrl, headers, opts) {
  const params = {
    maxRecords: Math.min(opts.maxRecords, MAX_RECORDS_LIMIT),
  };

  if (opts.filterFormula) params.filterByFormula = opts.filterFormula;
  if (opts.view) params.view = opts.view;
  if (opts.sort && Array.isArray(opts.sort)) {
    opts.sort.forEach((s, i) => {
      params[`sort[${i}][field]`] = s.field;
      params[`sort[${i}][direction]`] = s.direction || "asc";
    });
  }

  const response = await axios.get(tableUrl, {
    headers,
    params,
    timeout: 30000,
  });

  return {
    records: (response.data.records || []).map((r) => ({
      id: r.id,
      fields: r.fields,
      createdTime: r.createdTime,
    })),
    totalRecords: response.data.records?.length || 0,
    offset: response.data.offset || null,
  };
}

async function updateRecord(tableUrl, headers, recordId, fields, typecast) {
  const response = await axios.patch(
    `${tableUrl}/${encodeURIComponent(recordId)}`,
    { fields, typecast },
    { headers, timeout: 15000 },
  );
  return {
    id: response.data.id,
    fields: response.data.fields,
  };
}

async function deleteRecord(tableUrl, headers, recordId) {
  const response = await axios.delete(
    `${tableUrl}/${encodeURIComponent(recordId)}`,
    { headers, timeout: 15000 },
  );
  return {
    id: response.data.id,
    deleted: response.data.deleted,
  };
}

/**
 * Airtable — bulk operations (≤10 records/call): bulkCreate, bulkUpdate,
 * bulkDelete. `bulkUpdate` throws on invalid input (matching the monolith),
 * while bulkCreate/bulkDelete return skips. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { tableUrl, headers, BULK_LIMIT } from "../GenericFunctions.js";

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

async function opBulkDelete(config, token) {
  let ids = config.recordIds;
  if (typeof ids === "string") ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(ids) || ids.length === 0)
    return { success: false, error: "Airtable bulkDelete: 'recordIds' must be a non-empty list of record IDs.", skipped: true };
  if (ids.length > BULK_LIMIT)
    return { success: false, error: `Airtable bulkDelete: maximum ${BULK_LIMIT} records per call. Split into batches.`, skipped: true };
  const url = tableUrl(config.baseId, config.tableName);
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("records[]", id));
  const response = await axios.delete(`${url}?${params.toString()}`, { headers: headers(token), timeout: 20000 });
  return { records: response.data.records || [], deleted: (response.data.records || []).length };
}

export const bulkOperations = {
  bulkCreate: opBulkCreate,
  bulkUpdate: opBulkUpdate,
  bulkDelete: opBulkDelete,
};

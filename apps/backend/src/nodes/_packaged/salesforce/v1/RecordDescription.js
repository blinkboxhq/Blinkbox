/**
 * SALESFORCE — SObject record resource. createRecord / getRecord /
 * updateRecord / deleteRecord / upsertRecord preserved verbatim from the
 * monolith; getRecordByExternalId, getDeletedRecords and getUpdatedRecords
 * added for parity. Handlers receive (config, client).
 */
import { parseFields } from "../GenericFunctions.js";

async function opCreateRecord(config, client) {
  if (!config.objectType) return { success: false, error: "Salesforce createRecord: 'objectType' is required (e.g. Contact, Account).", skipped: true };
  const fields = parseFields(config.fields, "createRecord fields");
  if (!Object.keys(fields).length) return { success: false, error: "Salesforce createRecord: 'fields' (JSON object) is required.", skipped: true };
  const { data } = await client.post(`/sobjects/${client.enc(config.objectType)}`, fields);
  return { success: true, id: data.id, created: data.success };
}

async function opGetRecord(config, client) {
  if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce getRecord: 'objectType' and 'recordId' are required.", skipped: true };
  const params = config.fields ? { fields: config.fields } : {};
  const { data } = await client.get(`/sobjects/${client.enc(config.objectType)}/${client.enc(config.recordId)}`, { params });
  return { success: true, ...data };
}

async function opUpdateRecord(config, client) {
  if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce updateRecord: 'objectType' and 'recordId' are required.", skipped: true };
  const fields = parseFields(config.fields, "updateRecord fields");
  if (!Object.keys(fields).length) return { success: false, error: "Salesforce updateRecord: 'fields' (JSON object) is required.", skipped: true };
  await client.patch(`/sobjects/${client.enc(config.objectType)}/${client.enc(config.recordId)}`, fields);
  return { success: true, updated: true, recordId: config.recordId };
}

async function opDeleteRecord(config, client) {
  if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce deleteRecord: 'objectType' and 'recordId' are required.", skipped: true };
  await client.del(`/sobjects/${client.enc(config.objectType)}/${client.enc(config.recordId)}`);
  return { success: true, deleted: true, recordId: config.recordId };
}

async function opUpsertRecord(config, client) {
  if (!config.objectType || !config.externalIdField || !config.externalId) return { success: false, error: "Salesforce upsertRecord: 'objectType', 'externalIdField', and 'externalId' are required.", skipped: true };
  const fields = parseFields(config.fields, "upsertRecord fields");
  const { data } = await client.patch(
    `/sobjects/${client.enc(config.objectType)}/${client.enc(config.externalIdField)}/${client.enc(config.externalId)}`,
    fields,
  );
  return { success: true, id: data?.id, created: data?.created ?? null };
}

async function opGetRecordByExternalId(config, client) {
  if (!config.objectType || !config.externalIdField || !config.externalId) return { success: false, error: "Salesforce getRecordByExternalId: 'objectType', 'externalIdField', and 'externalId' are required.", skipped: true };
  const { data } = await client.get(
    `/sobjects/${client.enc(config.objectType)}/${client.enc(config.externalIdField)}/${client.enc(config.externalId)}`,
  );
  return { success: true, ...data };
}

async function opGetDeletedRecords(config, client) {
  if (!config.objectType || !config.startDate || !config.endDate) return { success: false, error: "Salesforce getDeletedRecords: 'objectType', 'startDate', and 'endDate' (ISO 8601) are required.", skipped: true };
  const { data } = await client.get(`/sobjects/${client.enc(config.objectType)}/deleted`, {
    params: { start: config.startDate, end: config.endDate },
  });
  return { success: true, deletedRecords: data.deletedRecords ?? [], earliestDateAvailable: data.earliestDateAvailable };
}

async function opGetUpdatedRecords(config, client) {
  if (!config.objectType || !config.startDate || !config.endDate) return { success: false, error: "Salesforce getUpdatedRecords: 'objectType', 'startDate', and 'endDate' (ISO 8601) are required.", skipped: true };
  const { data } = await client.get(`/sobjects/${client.enc(config.objectType)}/updated`, {
    params: { start: config.startDate, end: config.endDate },
  });
  return { success: true, ids: data.ids ?? [], latestDateCovered: data.latestDateCovered };
}

export const recordOperations = {
  createRecord: opCreateRecord,
  getRecord: opGetRecord,
  updateRecord: opUpdateRecord,
  deleteRecord: opDeleteRecord,
  upsertRecord: opUpsertRecord,
  getRecordByExternalId: opGetRecordByExternalId,
  getDeletedRecords: opGetDeletedRecords,
  getUpdatedRecords: opGetUpdatedRecords,
};

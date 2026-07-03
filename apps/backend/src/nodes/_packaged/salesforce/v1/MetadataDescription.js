/**
 * SALESFORCE — metadata resource. listObjects / describeObject preserved
 * verbatim from the monolith; describeGlobal, getRecentItems and
 * listApiVersions added for parity. Handlers receive (config, client).
 */
import axios from "axios";

async function opListObjects(_config, client) {
  const { data } = await client.get(`/sobjects`, { timeout: 20000 });
  const objects = data.sobjects?.map((o) => ({ name: o.name, label: o.label, queryable: o.queryable, createable: o.createable })) ?? [];
  return { success: true, objects, count: objects.length };
}

async function opDescribeObject(config, client) {
  if (!config.objectType) return { success: false, error: "Salesforce describeObject: 'objectType' is required.", skipped: true };
  const { data } = await client.get(`/sobjects/${client.enc(config.objectType)}/describe`, { timeout: 20000 });
  const fields = data.fields?.map((f) => ({ name: f.name, label: f.label, type: f.type, required: !f.nillable && !f.defaultedOnCreate })) ?? [];
  return { success: true, name: data.name, label: data.label, fields, fieldCount: fields.length };
}

async function opDescribeGlobal(_config, client) {
  const { data } = await client.get(`/sobjects`, { timeout: 20000 });
  return { success: true, encoding: data.encoding, maxBatchSize: data.maxBatchSize, sobjectCount: (data.sobjects ?? []).length };
}

async function opGetRecentItems(config, client) {
  if (!config.objectType) return { success: false, error: "Salesforce getRecentItems: 'objectType' is required.", skipped: true };
  const { data } = await client.get(`/sobjects/${client.enc(config.objectType)}`, { timeout: 15000 });
  return { success: true, recentItems: data.recentItems ?? [], objectDescribe: data.objectDescribe };
}

async function opListApiVersions(_config, client) {
  const url = client.base.replace(/\/services\/data\/.*$/, "/services/data");
  const { data } = await axios.get(url, { headers: client.headers, timeout: 15000 });
  return { success: true, versions: data };
}

export const metadataOperations = {
  listObjects: opListObjects,
  describeObject: opDescribeObject,
  describeGlobal: opDescribeGlobal,
  getRecentItems: opGetRecentItems,
  listApiVersions: opListApiVersions,
};

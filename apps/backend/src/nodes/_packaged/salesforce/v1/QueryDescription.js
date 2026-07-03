/**
 * SALESFORCE — query & search resource. queryRecords / searchRecords preserved
 * verbatim from the monolith; queryAll (includes deleted/archived), queryMore
 * (pagination) and getLimits added for parity. Handlers receive (config, client).
 */

async function opQueryRecords(config, client) {
  if (!config.query) return { success: false, error: "Salesforce queryRecords: 'query' (SOQL) is required.", skipped: true };
  const { data } = await client.get(`/query`, { timeout: 20000, params: { q: config.query } });
  return { success: true, records: data.records ?? [], totalSize: data.totalSize, done: data.done, nextRecordsUrl: data.nextRecordsUrl };
}

async function opSearchRecords(config, client) {
  if (!config.query) return { success: false, error: "Salesforce searchRecords: 'query' (SOSL) is required.", skipped: true };
  const { data } = await client.get(`/search`, { timeout: 20000, params: { q: config.query } });
  return { success: true, searchRecords: data.searchRecords ?? [] };
}

async function opQueryAll(config, client) {
  if (!config.query) return { success: false, error: "Salesforce queryAll: 'query' (SOQL) is required.", skipped: true };
  const { data } = await client.get(`/queryAll`, { timeout: 20000, params: { q: config.query } });
  return { success: true, records: data.records ?? [], totalSize: data.totalSize, done: data.done, nextRecordsUrl: data.nextRecordsUrl };
}

async function opQueryMore(config, client) {
  if (!config.nextRecordsUrl) return { success: false, error: "Salesforce queryMore: 'nextRecordsUrl' is required.", skipped: true };
  const locator = String(config.nextRecordsUrl).split("/").pop();
  const { data } = await client.get(`/query/${client.enc(locator)}`, { timeout: 20000 });
  return { success: true, records: data.records ?? [], totalSize: data.totalSize, done: data.done, nextRecordsUrl: data.nextRecordsUrl };
}

async function opGetLimits(_config, client) {
  const { data } = await client.get(`/limits`, { timeout: 15000 });
  return { success: true, limits: data };
}

export const queryOperations = {
  queryRecords: opQueryRecords,
  searchRecords: opSearchRecords,
  queryAll: opQueryAll,
  queryMore: opQueryMore,
  getLimits: opGetLimits,
};

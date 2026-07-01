/**
 * Netlify — DNS zones & records. Handlers receive `(config, { api })`.
 */
import { num, skip } from "../GenericFunctions.js";

async function opListDnsZones(config, { api }) {
  const res = await api.get(`/dns_zones`);
  return { success: true, count: res.data.length, zones: res.data };
}

async function opGetDnsZone(config, { api }) {
  if (!config.zoneId) return skip("getDnsZone", "'zoneId' is required.");
  const res = await api.get(`/dns_zones/${encodeURIComponent(config.zoneId)}`);
  return { success: true, ...res.data };
}

async function opListDnsRecords(config, { api }) {
  if (!config.zoneId) return skip("listDnsRecords", "'zoneId' is required.");
  const res = await api.get(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records`);
  return { success: true, count: res.data.length, records: res.data };
}

async function opCreateDnsRecord(config, { api }) {
  if (!config.zoneId) return skip("createDnsRecord", "'zoneId' is required.");
  if (!config.recordType) return skip("createDnsRecord", "'recordType' is required.");
  if (!config.recordHostname) return skip("createDnsRecord", "'recordHostname' is required.");
  if (!config.recordValue) return skip("createDnsRecord", "'recordValue' is required.");
  const body = { type: config.recordType, hostname: config.recordHostname, value: config.recordValue, ttl: num(config.ttl, 3600) };
  if (config.recordType === "MX") body.priority = num(config.priority, 10);
  const res = await api.post(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records`, body);
  return { success: true, id: res.data.id, ...body };
}

async function opDeleteDnsRecord(config, { api }) {
  if (!config.zoneId) return skip("deleteDnsRecord", "'zoneId' is required.");
  if (!config.recordId) return skip("deleteDnsRecord", "'recordId' is required.");
  await api.delete(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records/${encodeURIComponent(config.recordId)}`);
  return { success: true, deleted: config.recordId };
}

export const dnsOperations = {
  listDnsZones: opListDnsZones,
  getDnsZone: opGetDnsZone,
  listDnsRecords: opListDnsRecords,
  createDnsRecord: opCreateDnsRecord,
  deleteDnsRecord: opDeleteDnsRecord,
};

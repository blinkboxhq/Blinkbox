/**
 * Vercel — Account Domains & DNS records.
 */
import { skip, num } from "../GenericFunctions.js";

async function opListDomains(config, { api }) {
  const res = await api.get(`/v5/domains`, { params: { limit: num(config.limit, 50) } });
  return { success: true, count: res.data.domains?.length || 0, domains: res.data.domains };
}

async function opGetDomain(config, { api }) {
  if (!config.domain) return skip("getDomain", "'domain' is required.");
  const res = await api.get(`/v5/domains/${encodeURIComponent(config.domain)}`);
  return { success: true, ...res.data.domain };
}

async function opAddDomain(config, { api }) {
  if (!config.domain) return skip("addDomain", "'domain' is required.");
  const res = await api.post(`/v5/domains`, { name: config.domain });
  return { success: true, ...res.data.domain };
}

async function opRemoveDomain(config, { api }) {
  if (!config.domain) return skip("removeDomain", "'domain' is required.");
  await api.delete(`/v6/domains/${encodeURIComponent(config.domain)}`);
  return { success: true, removed: config.domain };
}

async function opCheckDomainAvailability(config, { api }) {
  if (!config.domain) return skip("checkDomainAvailability", "'domain' is required.");
  const res = await api.get(`/v4/domains/status`, { params: { name: config.domain } });
  return { success: true, domain: config.domain, available: res.data.available };
}

async function opListDnsRecords(config, { api }) {
  if (!config.domain) return skip("listDnsRecords", "'domain' is required.");
  const res = await api.get(`/v4/domains/${encodeURIComponent(config.domain)}/records`, { params: { limit: num(config.limit, 50) } });
  return { success: true, count: res.data.records?.length || 0, records: res.data.records };
}

async function opCreateDnsRecord(config, { api }) {
  if (!config.domain) return skip("createDnsRecord", "'domain' is required.");
  if (!config.recordType) return skip("createDnsRecord", "'recordType' is required.");
  if (!config.recordValue) return skip("createDnsRecord", "'recordValue' is required.");
  const body = { type: config.recordType, name: config.recordName || "", value: config.recordValue };
  if (config.ttl) body.ttl = num(config.ttl, 60);
  const res = await api.post(`/v2/domains/${encodeURIComponent(config.domain)}/records`, body);
  return { success: true, uid: res.data.uid };
}

async function opDeleteDnsRecord(config, { api }) {
  if (!config.domain) return skip("deleteDnsRecord", "'domain' is required.");
  if (!config.recordId) return skip("deleteDnsRecord", "'recordId' is required.");
  await api.delete(`/v2/domains/${encodeURIComponent(config.domain)}/records/${encodeURIComponent(config.recordId)}`);
  return { success: true, deleted: config.recordId };
}

export const domainOperations = {
  listAccountDomains: opListDomains,
  getDomain: opGetDomain,
  addAccountDomain: opAddDomain,
  removeDomain: opRemoveDomain,
  checkDomainAvailability: opCheckDomainAvailability,
  listDnsRecords: opListDnsRecords,
  createDnsRecord: opCreateDnsRecord,
  deleteDnsRecord: opDeleteDnsRecord,
};

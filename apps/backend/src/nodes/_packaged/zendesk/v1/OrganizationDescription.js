/**
 * Zendesk — Organizations.
 */
import { need, lim, enc, csv, parseJson } from "../GenericFunctions.js";

function buildOrg(config) {
  const o = {};
  if (config.name) o.name = config.name;
  if (config.domainNames) o.domain_names = csv(config.domainNames);
  if (config.externalId) o.external_id = config.externalId;
  if (config.notes) o.notes = config.notes;
  if (config.tags) o.tags = csv(config.tags);
  const fields = parseJson(config.organizationFields, "buildOrg", "organizationFields");
  if (fields) o.organization_fields = fields;
  return o;
}
async function opListOrganizations(config, { api }) {
  const { data } = await api.get(`/organizations.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, organizations: data.organizations || [], count: data.count };
}
async function opGetOrganization(config, { api }) {
  const g = need(config, "organizationId", "getOrganization"); if (g) return g;
  const { data } = await api.get(`/organizations/${enc(config.organizationId)}.json`);
  return data.organization;
}
async function opCreateOrganization(config, { api }) {
  const n = need(config, "name", "createOrganization"); if (n) return n;
  const { data } = await api.post(`/organizations.json`, { organization: buildOrg(config) });
  return data.organization;
}
async function opUpdateOrganization(config, { api }) {
  const g = need(config, "organizationId", "updateOrganization"); if (g) return g;
  const { data } = await api.put(`/organizations/${enc(config.organizationId)}.json`, { organization: buildOrg(config) });
  return data.organization;
}
async function opDeleteOrganization(config, { api }) {
  const g = need(config, "organizationId", "deleteOrganization"); if (g) return g;
  await api.delete(`/organizations/${enc(config.organizationId)}.json`);
  return { success: true, deleted: config.organizationId };
}
async function opSearchOrganizations(config, { api }) {
  const q = need(config, "query", "searchOrganizations"); if (q) return q;
  const { data } = await api.get(`/organizations/search.json`, { params: { name: config.query } });
  return { success: true, organizations: data.organizations || [], count: data.count };
}
async function opListOrganizationTickets(config, { api }) {
  const g = need(config, "organizationId", "listOrganizationTickets"); if (g) return g;
  const { data } = await api.get(`/organizations/${enc(config.organizationId)}/tickets.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}

export const organizationOperations = {
  listOrganizations: opListOrganizations, getOrganization: opGetOrganization,
  createOrganization: opCreateOrganization, updateOrganization: opUpdateOrganization,
  deleteOrganization: opDeleteOrganization, searchOrganizations: opSearchOrganizations,
  listOrganizationTickets: opListOrganizationTickets,
};

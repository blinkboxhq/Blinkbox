/**
 * Pipedrive — Person & Organization resources. CRUD + search for both.
 */
import { boundLimit, num } from "../GenericFunctions.js";

/* ---- Person ---- */
async function opListPersons(config, client) {
  const { data } = await client.get("/persons", { params: { limit: boundLimit(config.limit), start: Number(config.start) || 0 } });
  return { success: true, persons: data.data ?? [] };
}

async function opGetPerson(config, client) {
  if (!config.personId) return { success: false, error: "Pipedrive getPerson: personId required.", skipped: true };
  const { data } = await client.get(`/persons/${config.personId}`);
  if (!data.data) return { success: false, error: `Pipedrive: Person ${config.personId} not found.`, skipped: true };
  return { success: true, ...data.data };
}

function buildPersonBody(config) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.email) body.email = [{ value: config.email, primary: true }];
  if (config.phone) body.phone = [{ value: config.phone, primary: true }];
  if (config.orgId) body.org_id = num(config.orgId);
  if (config.ownerId) body.owner_id = num(config.ownerId);
  if (config.visibleTo != null) body.visible_to = num(config.visibleTo);
  return body;
}

async function opCreatePerson(config, client) {
  if (!config.name) return { success: false, error: "Pipedrive createPerson: name required.", skipped: true };
  const { data } = await client.post("/persons", { ...buildPersonBody(config), name: config.name });
  return { success: true, id: data.data?.id, name: data.data?.name, email: data.data?.email?.[0]?.value };
}

async function opUpdatePerson(config, client) {
  if (!config.personId) return { success: false, error: "Pipedrive updatePerson: personId required.", skipped: true };
  const { data } = await client.put(`/persons/${config.personId}`, buildPersonBody(config));
  return { success: true, id: data.data?.id, name: data.data?.name };
}

async function opDeletePerson(config, client) {
  if (!config.personId) return { success: false, error: "Pipedrive deletePerson: personId required.", skipped: true };
  await client.delete(`/persons/${config.personId}`);
  return { success: true, deleted: true, id: config.personId };
}

async function opSearchPersons(config, client) {
  if (!config.term) return { success: false, error: "Pipedrive searchPersons: term required.", skipped: true };
  const params = { term: config.term, limit: boundLimit(config.limit) };
  if (config.fields) params.fields = config.fields;
  if (config.orgId) params.organization_id = num(config.orgId);
  const { data } = await client.get("/persons/search", { params });
  return { success: true, items: data.data?.items ?? [], total: data.data?.items?.length ?? 0 };
}

/* ---- Organization ---- */
async function opListOrganizations(config, client) {
  const { data } = await client.get("/organizations", { params: { limit: boundLimit(config.limit), start: Number(config.start) || 0 } });
  return { success: true, organizations: data.data ?? [] };
}

async function opGetOrganization(config, client) {
  if (!config.orgId) return { success: false, error: "Pipedrive getOrganization: orgId required.", skipped: true };
  const { data } = await client.get(`/organizations/${config.orgId}`);
  if (!data.data) return { success: false, error: `Pipedrive: Organization ${config.orgId} not found.`, skipped: true };
  return { success: true, ...data.data };
}

function buildOrgBody(config) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.ownerId) body.owner_id = num(config.ownerId);
  if (config.visibleTo != null) body.visible_to = num(config.visibleTo);
  return body;
}

async function opCreateOrganization(config, client) {
  if (!config.name) return { success: false, error: "Pipedrive createOrganization: name required.", skipped: true };
  const { data } = await client.post("/organizations", { ...buildOrgBody(config), name: config.name });
  return { success: true, id: data.data?.id, name: data.data?.name };
}

async function opUpdateOrganization(config, client) {
  if (!config.orgId) return { success: false, error: "Pipedrive updateOrganization: orgId required.", skipped: true };
  const { data } = await client.put(`/organizations/${config.orgId}`, buildOrgBody(config));
  return { success: true, id: data.data?.id, name: data.data?.name };
}

async function opDeleteOrganization(config, client) {
  if (!config.orgId) return { success: false, error: "Pipedrive deleteOrganization: orgId required.", skipped: true };
  await client.delete(`/organizations/${config.orgId}`);
  return { success: true, deleted: true, id: config.orgId };
}

async function opSearchOrganizations(config, client) {
  if (!config.term) return { success: false, error: "Pipedrive searchOrganizations: term required.", skipped: true };
  const { data } = await client.get("/organizations/search", { params: { term: config.term, limit: boundLimit(config.limit) } });
  return { success: true, items: data.data?.items ?? [], total: data.data?.items?.length ?? 0 };
}

export const personOperations = {
  listPersons: opListPersons,
  getPerson: opGetPerson,
  createPerson: opCreatePerson,
  updatePerson: opUpdatePerson,
  deletePerson: opDeletePerson,
  searchPersons: opSearchPersons,
  listOrganizations: opListOrganizations,
  getOrganization: opGetOrganization,
  createOrganization: opCreateOrganization,
  updateOrganization: opUpdateOrganization,
  deleteOrganization: opDeleteOrganization,
  searchOrganizations: opSearchOrganizations,
};

/**
 * Sentry — organizations. Handlers receive `(config, ctx, context)` where
 * ctx = { org, headers }.
 */
import { BASE, enc, get, needOrg } from "../GenericFunctions.js";

async function opListOrganizations(config, ctx) {
  const data = await get(`${BASE}/organizations/`, ctx);
  return { organizations: data, count: data.length };
}

async function opGetOrganization(config, ctx) {
  const e = needOrg(config, ctx, "getOrganization"); if (e) return e;
  return get(`${BASE}/organizations/${enc(ctx.org)}/`, ctx);
}

async function opListOrgMembers(config, ctx) {
  const e = needOrg(config, ctx, "listOrgMembers"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/members/`, ctx);
  return { members: data.map((m) => ({ id: m.id, email: m.email, name: m.name, role: m.role })), count: data.length };
}

export const organizationOperations = {
  listOrganizations: opListOrganizations,
  getOrganization: opGetOrganization,
  listOrgMembers: opListOrgMembers,
};

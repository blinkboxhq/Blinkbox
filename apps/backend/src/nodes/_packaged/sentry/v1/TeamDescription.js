/**
 * Sentry — teams. Handlers receive `(config, ctx, context)` where
 * ctx = { org, headers }.
 */
import { BASE, enc, skip, get, needOrg } from "../GenericFunctions.js";

async function opListTeams(config, ctx) {
  const e = needOrg(config, ctx, "listTeams"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/teams/`, ctx);
  return { teams: data.map((t) => ({ id: t.id, slug: t.slug, name: t.name, memberCount: t.memberCount })), count: data.length };
}

async function opListTeamProjects(config, ctx) {
  const e = needOrg(config, ctx, "listTeamProjects"); if (e) return e;
  if (!config.team) return skip("listTeamProjects", "'team' slug required");
  const data = await get(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/projects/`, ctx);
  return { projects: data, count: data.length };
}

async function opListTeamMembers(config, ctx) {
  const e = needOrg(config, ctx, "listTeamMembers"); if (e) return e;
  if (!config.team) return skip("listTeamMembers", "'team' slug required");
  const data = await get(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/members/`, ctx);
  return { members: data, count: data.length };
}

export const teamOperations = {
  listTeams: opListTeams,
  listTeamProjects: opListTeamProjects,
  listTeamMembers: opListTeamMembers,
};

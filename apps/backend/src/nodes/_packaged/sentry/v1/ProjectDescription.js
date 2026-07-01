/**
 * Sentry — projects. Handlers receive `(config, ctx, context)` where
 * ctx = { org, headers }.
 */
import { BASE, enc, LIMIT, skip, get, post, put, needOrg } from "../GenericFunctions.js";

async function opListProjects(config, ctx) {
  const e = needOrg(config, ctx, "listProjects"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/projects/`, ctx);
  return { projects: data, count: data.length };
}

async function opGetProject(config, ctx) {
  const e = needOrg(config, ctx, "getProject"); if (e) return e;
  if (!config.project) return skip("getProject", "'project' slug required");
  return get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/`, ctx);
}

async function opCreateProject(config, ctx) {
  const e = needOrg(config, ctx, "createProject"); if (e) return e;
  if (!config.team) return skip("createProject", "'team' slug required");
  const data = await post(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/projects/`, { name: config.name || "New Project", platform: config.platform || "javascript" }, ctx);
  return { id: data.id, slug: data.slug, name: data.name, platform: data.platform };
}

async function opUpdateProject(config, ctx) {
  const e = needOrg(config, ctx, "updateProject"); if (e) return e;
  if (!config.project) return skip("updateProject", "'project' slug required");
  const body = {};
  if (config.name) body.name = config.name;
  if (config.platform) body.platform = config.platform;
  if (config.newSlug) body.slug = config.newSlug;
  const data = await put(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/`, body, ctx);
  return { id: data.id, slug: data.slug, name: data.name, updated: true };
}

async function opListProjectKeys(config, ctx) {
  const e = needOrg(config, ctx, "listProjectKeys"); if (e) return e;
  if (!config.project) return skip("listProjectKeys", "'project' slug required");
  const data = await get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/keys/`, ctx);
  return { keys: data.map((k) => ({ id: k.id, name: k.name, dsn: k.dsn?.public, isActive: k.isActive })), count: data.length };
}

async function opListProjectIssues(config, ctx) {
  const e = needOrg(config, ctx, "listProjectIssues"); if (e) return e;
  if (!config.project) return skip("listProjectIssues", "'project' slug required");
  const data = await get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/issues/?limit=${LIMIT(config)}&query=${enc(config.query || "is:unresolved")}`, ctx);
  return { issues: data, count: data.length };
}

export const projectOperations = {
  listProjects: opListProjects,
  getProject: opGetProject,
  createProject: opCreateProject,
  updateProject: opUpdateProject,
  listProjectKeys: opListProjectKeys,
  listProjectIssues: opListProjectIssues,
};

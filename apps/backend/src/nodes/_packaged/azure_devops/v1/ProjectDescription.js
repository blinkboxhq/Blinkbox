/**
 * Azure DevOps — projects & boards (teams, iterations, areas).
 * Handlers receive `(config, ctx)`.
 */
import { API, enc, LIMIT, skip, get } from "../GenericFunctions.js";

async function opListProjects(config, ctx) {
  const data = await get(`${ctx.ORG}/_apis/projects?$top=${LIMIT(config)}&api-version=${API}`, ctx);
  return { projects: (data.value || []).map((p) => ({ id: p.id, name: p.name, state: p.state, visibility: p.visibility })), count: data.count };
}

async function opGetProject(config, ctx) {
  if (!config.project) return skip("getProject", "'project' is required");
  const data = await get(`${ctx.ORG}/_apis/projects/${enc(config.project)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, description: data.description, state: data.state, url: data.url };
}

async function opListTeams(config, ctx) {
  if (!config.project) return skip("listTeams", "'project' is required");
  const data = await get(`${ctx.ORG}/_apis/projects/${enc(config.project)}/teams?api-version=${API}`, ctx);
  return { teams: (data.value || []).map((t) => ({ id: t.id, name: t.name })), count: data.count };
}

async function opListIterations(config, ctx) {
  if (!config.project || !config.team) return skip("listIterations", "'project' and 'team' are required");
  const data = await get(`${ctx.ORG}/${enc(config.project)}/${enc(config.team)}/_apis/work/teamsettings/iterations?api-version=${API}`, ctx);
  return { iterations: (data.value || []).map((i) => ({ id: i.id, name: i.name, path: i.path, ...i.attributes })), count: data.count };
}

async function opListAreas(config, ctx) {
  if (!config.project) return skip("listAreas", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/wit/classificationnodes/areas?$depth=2&api-version=${API}`, ctx);
  return { areas: data };
}

export const projectOperations = {
  listProjects: opListProjects,
  getProject: opGetProject,
  listTeams: opListTeams,
  listIterations: opListIterations,
  listAreas: opListAreas,
};

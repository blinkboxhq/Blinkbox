/**
 * Jira — projects, versions & components.
 * Handlers receive `(config, ctx)`.
 */
import { axios, LIMIT } from "../GenericFunctions.js";

async function opListProjects(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/project/search`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config, 50), query: config.query || undefined } });
  return { projects: res.data.values?.map((p) => ({ id: p.id, key: p.key, name: p.name, type: p.projectTypeKey })) ?? [], total: res.data.total };
}

async function opGetProject(config, ctx) {
  if (!config.project) return { success: false, error: "Jira getProject: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}`, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, key: res.data.key, name: res.data.name, lead: res.data.lead?.displayName, type: res.data.projectTypeKey, url: res.data.self };
}

async function opGetProjectStatuses(config, ctx) {
  if (!config.project) return { success: false, error: "Jira getProjectStatuses: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/statuses`, { headers: ctx.headers, timeout: 15000 });
  return { issueTypes: res.data.map((t) => ({ name: t.name, statuses: t.statuses?.map((s) => s.name) })) };
}

async function opListVersions(config, ctx) {
  if (!config.project) return { success: false, error: "Jira listVersions: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/versions`, { headers: ctx.headers, timeout: 15000 });
  return { versions: res.data.map((v) => ({ id: v.id, name: v.name, released: v.released, releaseDate: v.releaseDate })) };
}

async function opCreateVersion(config, ctx) {
  if (!config.projectId || !config.name) return { success: false, error: "Jira createVersion: 'projectId' and 'name' are required.", skipped: true };
  const res = await axios.post(`${ctx.BASE}/version`, { projectId: Number(config.projectId), name: config.name, description: config.description || undefined, releaseDate: config.releaseDate || undefined }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, name: res.data.name, created: true };
}

async function opListComponents(config, ctx) {
  if (!config.project) return { success: false, error: "Jira listComponents: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/components`, { headers: ctx.headers, timeout: 15000 });
  return { components: res.data.map((c) => ({ id: c.id, name: c.name, lead: c.lead?.displayName })) };
}

export const projectOperations = {
  listProjects: opListProjects,
  getProject: opGetProject,
  getProjectStatuses: opGetProjectStatuses,
  listVersions: opListVersions,
  createVersion: opCreateVersion,
  listComponents: opListComponents,
};

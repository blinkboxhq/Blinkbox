/**
 * Vercel — Projects & Project Domains.
 */
import { skip, num, projectShape } from "../GenericFunctions.js";

async function opListProjects(config, { api }) {
  const params = { limit: num(config.limit, 100) };
  if (config.search) params.search = config.search;
  const res = await api.get(`/v9/projects`, { params });
  return { success: true, count: res.data.projects.length, projects: res.data.projects.map(projectShape) };
}

async function opGetProject(config, { api }) {
  if (!config.projectId) return skip("getProject", "'projectId' is required.");
  const res = await api.get(`/v9/projects/${encodeURIComponent(config.projectId)}`);
  return { success: true, ...projectShape(res.data) };
}

async function opCreateProject(config, { api }) {
  if (!config.name) return skip("createProject", "'name' is required.");
  const body = { name: config.name };
  if (config.framework) body.framework = config.framework;
  if (config.gitRepo) body.gitRepository = { type: config.gitType || "github", repo: config.gitRepo };
  if (config.buildCommand) body.buildCommand = config.buildCommand;
  if (config.rootDirectory) body.rootDirectory = config.rootDirectory;
  const res = await api.post(`/v11/projects`, body);
  return { success: true, ...projectShape(res.data) };
}

async function opUpdateProject(config, { api }) {
  if (!config.projectId) return skip("updateProject", "'projectId' is required.");
  const body = {};
  if (config.name) body.name = config.name;
  if (config.framework) body.framework = config.framework;
  if (config.buildCommand !== undefined && config.buildCommand !== "") body.buildCommand = config.buildCommand;
  if (config.rootDirectory) body.rootDirectory = config.rootDirectory;
  if (config.nodeVersion) body.nodeVersion = config.nodeVersion;
  const res = await api.patch(`/v9/projects/${encodeURIComponent(config.projectId)}`, body);
  return { success: true, ...projectShape(res.data) };
}

async function opDeleteProject(config, { api }) {
  if (!config.projectId) return skip("deleteProject", "'projectId' is required.");
  await api.delete(`/v9/projects/${encodeURIComponent(config.projectId)}`);
  return { success: true, deleted: config.projectId };
}

async function opPauseProject(config, { api }) {
  if (!config.projectId) return skip("pauseProject", "'projectId' is required.");
  await api.post(`/v1/projects/${encodeURIComponent(config.projectId)}/pause`, {});
  return { success: true, paused: config.projectId };
}

async function opUnpauseProject(config, { api }) {
  if (!config.projectId) return skip("unpauseProject", "'projectId' is required.");
  await api.post(`/v1/projects/${encodeURIComponent(config.projectId)}/unpause`, {});
  return { success: true, unpaused: config.projectId };
}

async function opListProjectDomains(config, { api }) {
  if (!config.projectId) return skip("listProjectDomains", "'projectId' is required.");
  const res = await api.get(`/v9/projects/${encodeURIComponent(config.projectId)}/domains`);
  return {
    success: true,
    count: res.data.domains.length,
    domains: res.data.domains.map((d) => ({ name: d.name, apexName: d.apexName, verified: d.verified, redirect: d.redirect, createdAt: d.createdAt })),
  };
}

async function opAddProjectDomain(config, { api }) {
  if (!config.projectId) return skip("addProjectDomain", "'projectId' is required.");
  if (!config.domain) return skip("addProjectDomain", "'domain' is required.");
  const body = { name: config.domain };
  if (config.redirect) body.redirect = config.redirect;
  const res = await api.post(`/v10/projects/${encodeURIComponent(config.projectId)}/domains`, body);
  return { success: true, name: res.data.name, verified: res.data.verified, apexName: res.data.apexName };
}

async function opRemoveProjectDomain(config, { api }) {
  if (!config.projectId) return skip("removeProjectDomain", "'projectId' is required.");
  if (!config.domain) return skip("removeProjectDomain", "'domain' is required.");
  await api.delete(`/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(config.domain)}`);
  return { success: true, removed: config.domain };
}

async function opVerifyProjectDomain(config, { api }) {
  if (!config.projectId) return skip("verifyProjectDomain", "'projectId' is required.");
  if (!config.domain) return skip("verifyProjectDomain", "'domain' is required.");
  const res = await api.post(`/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(config.domain)}/verify`, {});
  return { success: true, name: res.data.name, verified: res.data.verified };
}

export const projectOperations = {
  listProjects: opListProjects,
  getProject: opGetProject,
  createProject: opCreateProject,
  updateProject: opUpdateProject,
  deleteProject: opDeleteProject,
  pauseProject: opPauseProject,
  unpauseProject: opUnpauseProject,
  listProjectDomains: opListProjectDomains,
  listDomains: opListProjectDomains,
  addProjectDomain: opAddProjectDomain,
  addDomain: opAddProjectDomain,
  removeProjectDomain: opRemoveProjectDomain,
  verifyProjectDomain: opVerifyProjectDomain,
};

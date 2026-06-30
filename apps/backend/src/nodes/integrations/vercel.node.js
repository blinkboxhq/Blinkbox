/**
 * VERCEL NODE — nuclear dispatch
 * Vercel REST API: deployments, projects, env vars, domains, DNS, aliases, teams, edge config.
 * Auth: Vercel API Token (Bearer) from credential vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://api.vercel.com";

const skip = (op, msg) => ({ success: false, error: `Vercel ${op}: ${msg}`, skipped: true });
const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));

function deployShape(d) {
  return {
    uid: d.uid || d.id,
    name: d.name,
    url: d.url ? `https://${d.url}` : undefined,
    state: d.readyState || d.state,
    target: d.target,
    createdAt: d.createdAt || d.created,
    aliases: d.alias || d.aliasAssigned || [],
    inspectorUrl: d.inspectorUrl,
    creator: d.creator?.username,
  };
}

function projectShape(p) {
  return {
    id: p.id,
    name: p.name,
    framework: p.framework,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    link: p.link,
    nodeVersion: p.nodeVersion,
    latestDeploymentUrl: p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : undefined,
  };
}

/* ---------------- Deployments ---------------- */

async function opListDeployments(config, { api }) {
  const params = { limit: num(config.limit, 10) };
  if (config.projectId) params.projectId = config.projectId;
  if (config.app) params.app = config.app;
  if (config.stateFilter && config.stateFilter !== "all") params.state = config.stateFilter;
  if (config.target) params.target = config.target;
  const res = await api.get(`/v6/deployments`, { params });
  return { success: true, count: res.data.deployments.length, deployments: res.data.deployments.map(deployShape) };
}

async function opGetDeployment(config, { api }) {
  if (!config.deploymentId) return skip("getDeployment", "'deploymentId' is required.");
  const res = await api.get(`/v13/deployments/${encodeURIComponent(config.deploymentId)}`);
  return { success: true, ...deployShape(res.data) };
}

async function opTriggerDeploy(config, { api }) {
  if (!config.projectId) return skip("triggerDeploy", "'projectId' is required.");
  const body = {
    name: config.projectId,
    target: config.target || "production",
    gitSource: { type: config.gitType || "github", ref: config.branch || "main" },
  };
  const res = await api.post(`/v13/deployments`, body, { timeout: 30000 });
  return { success: true, ...deployShape(res.data) };
}

async function opRedeploy(config, { api }) {
  if (!config.deploymentId) return skip("redeploy", "'deploymentId' is required.");
  const body = { deploymentId: config.deploymentId, name: config.app || config.projectId, target: config.target || "production" };
  const res = await api.post(`/v13/deployments`, body, { timeout: 30000 });
  return { success: true, ...deployShape(res.data) };
}

async function opCancelDeploy(config, { api }) {
  if (!config.deploymentId) return skip("cancelDeploy", "'deploymentId' is required.");
  const res = await api.patch(`/v12/deployments/${encodeURIComponent(config.deploymentId)}/cancel`, {});
  return { success: true, uid: res.data.uid, state: res.data.readyState || res.data.state };
}

async function opDeleteDeployment(config, { api }) {
  if (!config.deploymentId) return skip("deleteDeployment", "'deploymentId' is required.");
  await api.delete(`/v13/deployments/${encodeURIComponent(config.deploymentId)}`);
  return { success: true, deleted: config.deploymentId };
}

async function opListDeploymentFiles(config, { api }) {
  if (!config.deploymentId) return skip("listDeploymentFiles", "'deploymentId' is required.");
  const res = await api.get(`/v6/deployments/${encodeURIComponent(config.deploymentId)}/files`);
  return { success: true, files: res.data };
}

async function opGetDeploymentEvents(config, { api }) {
  if (!config.deploymentId) return skip("getDeploymentEvents", "'deploymentId' is required.");
  const res = await api.get(`/v3/deployments/${encodeURIComponent(config.deploymentId)}/events`, {
    params: { limit: num(config.limit, 100) },
  });
  return { success: true, events: res.data };
}

async function opListDeploymentAliases(config, { api }) {
  if (!config.deploymentId) return skip("listDeploymentAliases", "'deploymentId' is required.");
  const res = await api.get(`/v2/deployments/${encodeURIComponent(config.deploymentId)}/aliases`);
  return { success: true, count: res.data.aliases?.length || 0, aliases: res.data.aliases };
}

async function opPromoteDeployment(config, { api }) {
  if (!config.projectId) return skip("promoteDeployment", "'projectId' is required.");
  if (!config.deploymentId) return skip("promoteDeployment", "'deploymentId' is required.");
  const res = await api.post(`/v10/projects/${encodeURIComponent(config.projectId)}/promote/${encodeURIComponent(config.deploymentId)}`, {});
  return { success: true, promoted: config.deploymentId, data: res.data };
}

/* ---------------- Projects ---------------- */

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

/* ---------------- Project Domains ---------------- */

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

/* ---------------- Env Vars ---------------- */

async function opListEnvVars(config, { api }) {
  if (!config.projectId) return skip("listEnvVars", "'projectId' is required.");
  const res = await api.get(`/v9/projects/${encodeURIComponent(config.projectId)}/env`);
  return {
    success: true,
    count: res.data.envs.length,
    envVars: res.data.envs.map((e) => ({ id: e.id, key: e.key, target: e.target, type: e.type, createdAt: e.createdAt })),
  };
}

async function opGetEnvVar(config, { api }) {
  if (!config.projectId) return skip("getEnvVar", "'projectId' is required.");
  if (!config.envId) return skip("getEnvVar", "'envId' is required.");
  const res = await api.get(`/v1/projects/${encodeURIComponent(config.projectId)}/env/${encodeURIComponent(config.envId)}`, {
    params: { decrypt: config.decrypt ? "true" : undefined },
  });
  return { success: true, ...res.data };
}

async function opCreateEnvVar(config, { api }) {
  if (!config.projectId) return skip("createEnvVar", "'projectId' is required.");
  if (!config.key) return skip("createEnvVar", "'key' is required.");
  const body = {
    key: config.key,
    value: config.value ?? "",
    type: config.envType || "encrypted",
    target: csv(config.target || "production,preview,development"),
  };
  if (config.gitBranch) body.gitBranch = config.gitBranch;
  const res = await api.post(`/v10/projects/${encodeURIComponent(config.projectId)}/env`, body);
  return { success: true, created: res.data.created || res.data };
}

async function opUpdateEnvVar(config, { api }) {
  if (!config.projectId) return skip("updateEnvVar", "'projectId' is required.");
  if (!config.envId) return skip("updateEnvVar", "'envId' is required.");
  const body = {};
  if (config.value !== undefined) body.value = config.value;
  if (config.target) body.target = csv(config.target);
  if (config.envType) body.type = config.envType;
  const res = await api.patch(`/v9/projects/${encodeURIComponent(config.projectId)}/env/${encodeURIComponent(config.envId)}`, body);
  return { success: true, updated: res.data };
}

async function opDeleteEnvVar(config, { api }) {
  if (!config.projectId) return skip("deleteEnvVar", "'projectId' is required.");
  if (!config.envId) return skip("deleteEnvVar", "'envId' is required.");
  await api.delete(`/v9/projects/${encodeURIComponent(config.projectId)}/env/${encodeURIComponent(config.envId)}`);
  return { success: true, deleted: config.envId };
}

/* ---------------- Account Domains ---------------- */

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

/* ---------------- DNS ---------------- */

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

/* ---------------- Aliases ---------------- */

async function opListAliases(config, { api }) {
  const params = { limit: num(config.limit, 20) };
  if (config.projectId) params.projectId = config.projectId;
  const res = await api.get(`/v4/aliases`, { params });
  return { success: true, count: res.data.aliases?.length || 0, aliases: res.data.aliases };
}

async function opAssignAlias(config, { api }) {
  if (!config.deploymentId) return skip("assignAlias", "'deploymentId' is required.");
  if (!config.alias) return skip("assignAlias", "'alias' is required.");
  const res = await api.post(`/v2/deployments/${encodeURIComponent(config.deploymentId)}/aliases`, { alias: config.alias });
  return { success: true, alias: res.data.alias, uid: res.data.uid };
}

async function opDeleteAlias(config, { api }) {
  if (!config.aliasId) return skip("deleteAlias", "'aliasId' is required.");
  const res = await api.delete(`/v2/aliases/${encodeURIComponent(config.aliasId)}`);
  return { success: true, status: res.data.status };
}

/* ---------------- Teams ---------------- */

async function opListTeams(config, { api }) {
  const res = await api.get(`/v2/teams`, { params: { limit: num(config.limit, 20) } });
  return { success: true, count: res.data.teams?.length || 0, teams: res.data.teams };
}

async function opGetTeam(config, { api }) {
  if (!config.teamId) return skip("getTeam", "'teamId' is required.");
  const res = await api.get(`/v2/teams/${encodeURIComponent(config.teamId)}`);
  return { success: true, ...res.data };
}

async function opListTeamMembers(config, { api }) {
  if (!config.teamId) return skip("listTeamMembers", "'teamId' is required.");
  const res = await api.get(`/v2/teams/${encodeURIComponent(config.teamId)}/members`, { params: { limit: num(config.limit, 50) } });
  return { success: true, count: res.data.members?.length || 0, members: res.data.members };
}

/* ---------------- Edge Config & Misc ---------------- */

async function opListEdgeConfigs(config, { api }) {
  const res = await api.get(`/v1/edge-config`);
  return { success: true, count: res.data?.length || 0, edgeConfigs: res.data };
}

async function opGetCurrentUser(config, { api }) {
  const res = await api.get(`/v2/user`);
  return { success: true, ...res.data.user };
}

const OPERATIONS = {
  listDeployments: opListDeployments,
  getDeployment: opGetDeployment,
  triggerDeploy: opTriggerDeploy,
  createDeployment: opTriggerDeploy,
  redeploy: opRedeploy,
  cancelDeploy: opCancelDeploy,
  deleteDeployment: opDeleteDeployment,
  listDeploymentFiles: opListDeploymentFiles,
  getDeploymentEvents: opGetDeploymentEvents,
  listDeploymentAliases: opListDeploymentAliases,
  promoteDeployment: opPromoteDeployment,
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
  listEnvVars: opListEnvVars,
  getEnvVars: opListEnvVars,
  getEnvVar: opGetEnvVar,
  createEnvVar: opCreateEnvVar,
  updateEnvVar: opUpdateEnvVar,
  deleteEnvVar: opDeleteEnvVar,
  listAccountDomains: opListDomains,
  getDomain: opGetDomain,
  addAccountDomain: opAddDomain,
  removeDomain: opRemoveDomain,
  checkDomainAvailability: opCheckDomainAvailability,
  listDnsRecords: opListDnsRecords,
  createDnsRecord: opCreateDnsRecord,
  deleteDnsRecord: opDeleteDnsRecord,
  listAliases: opListAliases,
  assignAlias: opAssignAlias,
  deleteAlias: opDeleteAlias,
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamMembers: opListTeamMembers,
  listEdgeConfigs: opListEdgeConfigs,
  getCurrentUser: opGetCurrentUser,
};

function handleError(err) {
  if (err.message?.startsWith("Vercel")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Vercel: Authentication failed — check your API token.`);
  if (status === 403) throw new Error(`Vercel: Forbidden — ${msg}. Token may lack access to this resource.`);
  if (status === 404) throw new Error(`Vercel: Not found — ${msg}. Check the ID/slug.`);
  if (status === 409) throw new Error(`Vercel: Conflict — ${msg}`);
  if (status === 429) throw new Error(`Vercel: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Vercel: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listDeployments";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Vercel: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Vercel: No credential selected — pick a Vercel API Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Vercel");
    } catch (e) {
      return { success: false, error: `Vercel: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const teamParams = config.teamId ? { teamId: config.teamId } : {};
    if (config.slug) teamParams.slug = config.slug;
    const api = axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      params: teamParams,
      timeout: 15000,
    });

    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};

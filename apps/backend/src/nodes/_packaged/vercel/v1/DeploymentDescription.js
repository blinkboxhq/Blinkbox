/**
 * Vercel — Deployments.
 */
import { skip, num, deployShape } from "../GenericFunctions.js";

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
  const res = await api.post(`/v13/deployments`, body, { timeout: 120000 });
  return { success: true, ...deployShape(res.data) };
}

async function opRedeploy(config, { api }) {
  if (!config.deploymentId) return skip("redeploy", "'deploymentId' is required.");
  const body = { deploymentId: config.deploymentId, name: config.app || config.projectId, target: config.target || "production" };
  const res = await api.post(`/v13/deployments`, body, { timeout: 120000 });
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

export const deploymentOperations = {
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
};

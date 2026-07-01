/**
 * Vercel — Environment Variables.
 */
import { skip, csv } from "../GenericFunctions.js";

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

export const envVarOperations = {
  listEnvVars: opListEnvVars,
  getEnvVars: opListEnvVars,
  getEnvVar: opGetEnvVar,
  createEnvVar: opCreateEnvVar,
  updateEnvVar: opUpdateEnvVar,
  deleteEnvVar: opDeleteEnvVar,
};

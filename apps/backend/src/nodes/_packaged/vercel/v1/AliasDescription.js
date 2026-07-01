/**
 * Vercel — Aliases.
 */
import { skip, num } from "../GenericFunctions.js";

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

export const aliasOperations = {
  listAliases: opListAliases,
  assignAlias: opAssignAlias,
  deleteAlias: opDeleteAlias,
};

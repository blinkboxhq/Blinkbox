/**
 * Vercel — Teams, Edge Config & Misc.
 */
import { skip, num } from "../GenericFunctions.js";

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

async function opListEdgeConfigs(config, { api }) {
  const res = await api.get(`/v1/edge-config`);
  return { success: true, count: res.data?.length || 0, edgeConfigs: res.data };
}

async function opGetCurrentUser(config, { api }) {
  const res = await api.get(`/v2/user`);
  return { success: true, ...res.data.user };
}

export const teamOperations = {
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamMembers: opListTeamMembers,
  listEdgeConfigs: opListEdgeConfigs,
  getCurrentUser: opGetCurrentUser,
};

/**
 * PagerDuty — users, teams & priorities. Handlers receive `(config, { api })`.
 */
import { need, num } from "../GenericFunctions.js";

async function opListUsers(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/users", { params });
  return { success: true, total: data.total, users: data.users };
}

async function opGetUser(config, { api }) {
  const e = need(config, "userId", "getUser"); if (e) return e;
  const { data } = await api.get(`/users/${config.userId}`);
  return { success: true, ...data.user };
}

async function opGetCurrentUser(config, { api }) {
  const { data } = await api.get("/users/me");
  return { success: true, ...data.user };
}

async function opListContactMethods(config, { api }) {
  const e = need(config, "userId", "listContactMethods"); if (e) return e;
  const { data } = await api.get(`/users/${config.userId}/contact_methods`);
  return { success: true, count: data.contact_methods.length, contactMethods: data.contact_methods };
}

async function opListTeams(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/teams", { params });
  return { success: true, total: data.total, teams: data.teams };
}

async function opGetTeam(config, { api }) {
  const e = need(config, "teamId", "getTeam"); if (e) return e;
  const { data } = await api.get(`/teams/${config.teamId}`);
  return { success: true, ...data.team };
}

async function opListTeamMembers(config, { api }) {
  const e = need(config, "teamId", "listTeamMembers"); if (e) return e;
  const { data } = await api.get(`/teams/${config.teamId}/members`, { params: { limit: num(config.limit, 25) } });
  return { success: true, count: data.members.length, members: data.members };
}

async function opListPriorities(config, { api }) {
  const { data } = await api.get("/priorities");
  return { success: true, count: data.priorities.length, priorities: data.priorities };
}

export const directoryOperations = {
  listUsers: opListUsers,
  getUser: opGetUser,
  getCurrentUser: opGetCurrentUser,
  listContactMethods: opListContactMethods,
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamMembers: opListTeamMembers,
  listPriorities: opListPriorities,
};

/**
 * Zendesk — Users.
 */
import { need, lim, enc, csv, num } from "../GenericFunctions.js";

function buildUser(config) {
  const u = {};
  if (config.name) u.name = config.name;
  if (config.email) u.email = config.email;
  if (config.role) u.role = config.role;
  if (config.phone) u.phone = config.phone;
  if (config.externalId) u.external_id = config.externalId;
  if (config.organizationId) u.organization_id = num(config.organizationId);
  if (config.tags) u.tags = csv(config.tags);
  if (config.notes) u.notes = config.notes;
  return u;
}
async function opListUsers(config, { api }) {
  const params = { per_page: lim(config.limit) };
  if (config.role) params["role[]"] = config.role;
  const { data } = await api.get(`/users.json`, { params });
  return { success: true, users: data.users || [], count: data.count };
}
async function opGetUser(config, { api }) {
  const g = need(config, "userId", "getUser"); if (g) return g;
  const { data } = await api.get(`/users/${enc(config.userId)}.json`);
  return data.user;
}
async function opCreateUser(config, { api }) {
  const n = need(config, "name", "createUser"); if (n) return n;
  const e = need(config, "email", "createUser"); if (e) return e;
  const user = buildUser(config);
  user.role = user.role || "end-user";
  const { data } = await api.post(`/users.json`, { user });
  return data.user;
}
async function opUpdateUser(config, { api }) {
  const g = need(config, "userId", "updateUser"); if (g) return g;
  const { data } = await api.put(`/users/${enc(config.userId)}.json`, { user: buildUser(config) });
  return data.user;
}
async function opDeleteUser(config, { api }) {
  const g = need(config, "userId", "deleteUser"); if (g) return g;
  const { data } = await api.delete(`/users/${enc(config.userId)}.json`);
  return data.user || { success: true, deleted: config.userId };
}
async function opCreateOrUpdateUser(config, { api }) {
  const e = need(config, "email", "createOrUpdateUser"); if (e) return e;
  const user = buildUser(config);
  user.name = user.name || config.email;
  const { data } = await api.post(`/users/create_or_update.json`, { user });
  return data.user;
}
async function opSearchUsers(config, { api }) {
  const q = need(config, "query", "searchUsers"); if (q) return q;
  const { data } = await api.get(`/users/search.json`, { params: { query: config.query, per_page: lim(config.limit) } });
  return { success: true, users: data.users || [], count: data.count };
}
async function opListUserTickets(config, { api }) {
  const g = need(config, "userId", "listUserTickets"); if (g) return g;
  const which = config.ticketRole === "assigned" ? "assigned" : config.ticketRole === "ccd" ? "ccd" : "requested";
  const { data } = await api.get(`/users/${enc(config.userId)}/tickets/${which}.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}
async function opAddUserTags(config, { api }) {
  const g = need(config, "userId", "addUserTags"); if (g) return g;
  const t = need(config, "tags", "addUserTags"); if (t) return t;
  const { data } = await api.put(`/users/${enc(config.userId)}/tags.json`, { tags: csv(config.tags) });
  return { success: true, tags: data.tags };
}

export const userOperations = {
  listUsers: opListUsers, getUser: opGetUser, createUser: opCreateUser, updateUser: opUpdateUser,
  deleteUser: opDeleteUser, createOrUpdateUser: opCreateOrUpdateUser, searchUsers: opSearchUsers,
  listUserTickets: opListUserTickets, addUserTags: opAddUserTags,
};

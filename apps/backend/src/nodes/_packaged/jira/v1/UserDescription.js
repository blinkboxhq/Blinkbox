/**
 * Jira — users (current user, search users).
 * Handlers receive `(config, ctx)`.
 */
import { axios, LIMIT } from "../GenericFunctions.js";

async function opGetCurrentUser(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/myself`, { headers: ctx.headers, timeout: 15000 });
  return { accountId: res.data.accountId, name: res.data.displayName, email: res.data.emailAddress, timeZone: res.data.timeZone };
}

async function opSearchUsers(config, ctx) {
  if (!config.query) return { success: false, error: "Jira searchUsers: 'query' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/user/search`, { headers: ctx.headers, timeout: 15000, params: { query: config.query, maxResults: LIMIT(config) } });
  return { users: res.data.map((u) => ({ accountId: u.accountId, name: u.displayName, email: u.emailAddress, active: u.active })) };
}

export const userOperations = {
  getCurrentUser: opGetCurrentUser,
  searchUsers: opSearchUsers,
};

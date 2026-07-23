/**
 * Notion — workspace user operations: list, get.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers } from "../GenericFunctions.js";

async function opListUsers(config, token) {
  const params = { page_size: Math.min(Number(config.pageSize) || 50, 100) };
  if (config.startCursor) params.start_cursor = config.startCursor;
  const response = await axios.get(`${BASE}/users`, { headers: headers(token), params, timeout: 120000 });
  return {
    users: (response.data.results || []).map((u) => ({ id: u.id, name: u.name, type: u.type, email: u.person?.email })),
    hasMore: response.data.has_more, nextCursor: response.data.next_cursor,
  };
}

async function opGetUser(config, token) {
  if (!config.userId) return { success: false, error: "Notion getUser: 'userId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/users/${encodeURIComponent(config.userId)}`, { headers: headers(token), timeout: 120000 });
  const u = response.data;
  return { id: u.id, name: u.name, type: u.type, email: u.person?.email, avatar: u.avatar_url };
}

export const userOperations = {
  listUsers: opListUsers,
  getUser: opGetUser,
};

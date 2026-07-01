/**
 * Datadog — Users (API v2).
 */
import { need, num } from "../GenericFunctions.js";

async function opListUsers(config, { v2 }) {
  const { data } = await v2.get("/users", { params: { "page[size]": num(config.limit, 25), filter: config.query } });
  return { success: true, users: data.data, count: data.data?.length || 0 };
}

async function opGetUser(config, { v2 }) {
  const e = need(config, "userId", "getUser"); if (e) return e;
  const { data } = await v2.get(`/users/${encodeURIComponent(config.userId)}`);
  return { success: true, ...data.data };
}

export const userOperations = {
  listUsers: opListUsers,
  getUser: opGetUser,
};

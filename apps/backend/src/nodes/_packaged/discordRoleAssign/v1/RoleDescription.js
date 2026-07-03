/**
 * DISCORD ROLE ASSIGN — Role resource. add/remove preserved verbatim from the
 * monolith; listRoles, listMemberRoles, getMember, createRole, deleteRole added
 * for parity. Each op validates exactly the IDs it needs (SKIP on missing).
 * Handlers receive (config, client).
 */

function needMember(config, op) {
  if (config.guildId && config.userId && config.roleId) return null;
  return { success: false, error: `discord_role_assign ${op}: 'guildId', 'userId', and 'roleId' are required.`, skipped: true };
}

async function opAdd(config, client) {
  const miss = needMember(config, "add"); if (miss) return miss;
  await client.put(`/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`, {});
  return { userId: config.userId, roleId: config.roleId, guildId: config.guildId, action: "added" };
}

async function opRemove(config, client) {
  const miss = needMember(config, "remove"); if (miss) return miss;
  await client.del(`/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`);
  return { userId: config.userId, roleId: config.roleId, guildId: config.guildId, action: "removed" };
}

async function opListRoles(config, client) {
  if (!config.guildId) return { success: false, error: "discord_role_assign listRoles: 'guildId' is required.", skipped: true };
  const res = await client.get(`/guilds/${config.guildId}/roles`);
  return { roles: res.data.map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position, managed: r.managed })), count: res.data.length };
}

async function opGetMember(config, client) {
  if (!config.guildId || !config.userId) return { success: false, error: "discord_role_assign getMember: 'guildId' and 'userId' are required.", skipped: true };
  const res = await client.get(`/guilds/${config.guildId}/members/${config.userId}`);
  return { userId: res.data.user?.id, username: res.data.user?.username, nick: res.data.nick, roles: res.data.roles, joinedAt: res.data.joined_at };
}

async function opListMemberRoles(config, client) {
  if (!config.guildId || !config.userId) return { success: false, error: "discord_role_assign listMemberRoles: 'guildId' and 'userId' are required.", skipped: true };
  const res = await client.get(`/guilds/${config.guildId}/members/${config.userId}`);
  return { userId: config.userId, roles: res.data.roles || [], count: (res.data.roles || []).length };
}

async function opCreateRole(config, client) {
  if (!config.guildId || !config.name) return { success: false, error: "discord_role_assign createRole: 'guildId' and 'name' are required.", skipped: true };
  const body = { name: config.name };
  if (typeof config.color === "number") body.color = config.color;
  if (config.permissions) body.permissions = String(config.permissions);
  const res = await client.post(`/guilds/${config.guildId}/roles`, body);
  return { id: res.data.id, name: res.data.name, guildId: config.guildId };
}

async function opDeleteRole(config, client) {
  if (!config.guildId || !config.roleId) return { success: false, error: "discord_role_assign deleteRole: 'guildId' and 'roleId' are required.", skipped: true };
  await client.del(`/guilds/${config.guildId}/roles/${config.roleId}`);
  return { guildId: config.guildId, roleId: config.roleId, deleted: true };
}

export const roleOperations = {
  add: opAdd,
  remove: opRemove,
  listRoles: opListRoles,
  getMember: opGetMember,
  listMemberRoles: opListMemberRoles,
  createRole: opCreateRole,
  deleteRole: opDeleteRole,
};

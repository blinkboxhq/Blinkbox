/**
 * Discord — Bot REST members & roles: role add/remove, kick/ban/unban, get/list.
 * Handlers receive `(config, token)`.
 */
import { bot, need } from "../GenericFunctions.js";

async function opAddRole(config, token) {
  const err = need(config, ["guildId", "userId", "roleId"], "addRole"); if (err) return err;
  await bot(token, "put", `/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`);
  return { ok: true, userId: config.userId, roleId: config.roleId, added: true };
}

async function opRemoveRole(config, token) {
  const err = need(config, ["guildId", "userId", "roleId"], "removeRole"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`);
  return { ok: true, userId: config.userId, roleId: config.roleId, removed: true };
}

async function opKickMember(config, token) {
  const err = need(config, ["guildId", "userId"], "kickMember"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/members/${config.userId}`);
  return { ok: true, userId: config.userId, kicked: true };
}

async function opBanMember(config, token) {
  const err = need(config, ["guildId", "userId"], "banMember"); if (err) return err;
  const body = {};
  if (config.deleteMessageSeconds) body.delete_message_seconds = Number(config.deleteMessageSeconds);
  await bot(token, "put", `/guilds/${config.guildId}/bans/${config.userId}`, body);
  return { ok: true, userId: config.userId, banned: true };
}

async function opUnbanMember(config, token) {
  const err = need(config, ["guildId", "userId"], "unbanMember"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/bans/${config.userId}`);
  return { ok: true, userId: config.userId, unbanned: true };
}

async function opGetMember(config, token) {
  const err = need(config, ["guildId", "userId"], "getMember"); if (err) return err;
  const m = await bot(token, "get", `/guilds/${config.guildId}/members/${config.userId}`);
  return { ok: true, userId: m.user?.id, username: m.user?.username, nick: m.nick, roles: m.roles, joinedAt: m.joined_at };
}

async function opListMembers(config, token) {
  const err = need(config, ["guildId"], "listMembers"); if (err) return err;
  const data = await bot(token, "get", `/guilds/${config.guildId}/members`, null, { limit: Math.min(Number(config.limit) || 100, 1000) });
  return { ok: true, count: data.length, members: data.map((m) => ({ userId: m.user?.id, username: m.user?.username, nick: m.nick, roles: m.roles })) };
}

export const memberOperations = {
  addRole: opAddRole,
  removeRole: opRemoveRole,
  kickMember: opKickMember,
  banMember: opBanMember,
  unbanMember: opUnbanMember,
  getMember: opGetMember,
  listMembers: opListMembers,
};

/**
 * Discord — Bot REST guild: getGuild, listRoles. Handlers receive `(config, token)`.
 */
import { bot, need, p } from "../GenericFunctions.js";

async function opGetGuild(config, token) {
  const err = need(config, ["guildId"], "getGuild"); if (err) return err;
  const g = await bot(token, "get", p`/guilds/${config.guildId}`, null, { with_counts: true });
  return { ok: true, id: g.id, name: g.name, ownerId: g.owner_id, memberCount: g.approximate_member_count, description: g.description };
}

async function opListRoles(config, token) {
  const err = need(config, ["guildId"], "listRoles"); if (err) return err;
  const data = await bot(token, "get", p`/guilds/${config.guildId}/roles`);
  return { ok: true, count: data.length, roles: data.map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position })) };
}

export const guildOperations = {
  getGuild: opGetGuild,
  listRoles: opListRoles,
};

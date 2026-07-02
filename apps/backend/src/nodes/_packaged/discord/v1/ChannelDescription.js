/**
 * Discord — Bot REST channels: create/list/get. Handlers receive `(config, token)`.
 */
import { bot, need } from "../GenericFunctions.js";

async function opCreateChannel(config, token) {
  const err = need(config, ["guildId", "channelName"], "createChannel"); if (err) return err;
  const body = { name: String(config.channelName).substring(0, 100), type: Number(config.channelType ?? 0) };
  if (config.topic) body.topic = String(config.topic).substring(0, 1024);
  if (config.parentId) body.parent_id = config.parentId;
  const data = await bot(token, "post", `/guilds/${config.guildId}/channels`, body);
  return { ok: true, channelId: data.id, channelName: data.name };
}

async function opListChannels(config, token) {
  const err = need(config, ["guildId"], "listChannels"); if (err) return err;
  const data = await bot(token, "get", `/guilds/${config.guildId}/channels`);
  return { ok: true, count: data.length, channels: data.map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position, parentId: c.parent_id })) };
}

async function opGetChannel(config, token) {
  const err = need(config, ["channelId"], "getChannel"); if (err) return err;
  const c = await bot(token, "get", `/channels/${config.channelId}`);
  return { ok: true, id: c.id, name: c.name, type: c.type, topic: c.topic, guildId: c.guild_id, nsfw: c.nsfw };
}

export const channelOperations = {
  createChannel: opCreateChannel,
  listChannels: opListChannels,
  getChannel: opGetChannel,
};

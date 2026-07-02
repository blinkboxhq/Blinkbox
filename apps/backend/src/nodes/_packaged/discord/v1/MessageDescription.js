/**
 * Discord — Bot REST messages: send/edit/delete/list, pins, reactions, threads.
 * Handlers receive `(config, token)`.
 */
import { bot, need, buildEmbed } from "../GenericFunctions.js";

async function opBotSendMessage(config, token) {
  const err = need(config, ["channelId"], "botSendMessage"); if (err) return err;
  const body = {};
  if (config.message) body.content = String(config.message).substring(0, 2000);
  if (config.title || config.description || (Array.isArray(config.fields) && config.fields.length)) body.embeds = [buildEmbed(config)];
  if (!body.content && !body.embeds) return { success: false, error: "Discord botSendMessage: 'message' or embed content is required.", skipped: true };
  const data = await bot(token, "post", `/channels/${config.channelId}/messages`, body);
  return { ok: true, messageId: data.id, channelId: data.channel_id };
}

async function opEditMessage(config, token) {
  const err = need(config, ["channelId", "messageId"], "editMessage"); if (err) return err;
  const body = {};
  if (config.message) body.content = String(config.message).substring(0, 2000);
  if (config.title || config.description) body.embeds = [buildEmbed(config)];
  const data = await bot(token, "patch", `/channels/${config.channelId}/messages/${config.messageId}`, body);
  return { ok: true, messageId: data.id };
}

async function opDeleteMessage(config, token) {
  const err = need(config, ["channelId", "messageId"], "deleteMessage"); if (err) return err;
  await bot(token, "delete", `/channels/${config.channelId}/messages/${config.messageId}`);
  return { ok: true, messageId: config.messageId, deleted: true };
}

async function opGetMessages(config, token) {
  const err = need(config, ["channelId"], "getMessages"); if (err) return err;
  const data = await bot(token, "get", `/channels/${config.channelId}/messages`, null, { limit: Math.min(Number(config.limit) || 50, 100) });
  return { ok: true, count: data.length, messages: data.map((m) => ({ id: m.id, content: m.content, author: m.author?.username, authorId: m.author?.id, timestamp: m.timestamp })) };
}

async function opPinMessage(config, token) {
  const err = need(config, ["channelId", "messageId"], "pinMessage"); if (err) return err;
  await bot(token, "put", `/channels/${config.channelId}/pins/${config.messageId}`);
  return { ok: true, messageId: config.messageId, pinned: true };
}

async function opUnpinMessage(config, token) {
  const err = need(config, ["channelId", "messageId"], "unpinMessage"); if (err) return err;
  await bot(token, "delete", `/channels/${config.channelId}/pins/${config.messageId}`);
  return { ok: true, messageId: config.messageId, unpinned: true };
}

async function opAddReaction(config, token) {
  const err = need(config, ["channelId", "messageId", "emoji"], "addReaction"); if (err) return err;
  const emoji = encodeURIComponent(config.emoji.replace(/:/g, ""));
  await bot(token, "put", `/channels/${config.channelId}/messages/${config.messageId}/reactions/${emoji}/@me`);
  return { ok: true, emoji: config.emoji, messageId: config.messageId };
}

async function opRemoveReaction(config, token) {
  const err = need(config, ["channelId", "messageId", "emoji"], "removeReaction"); if (err) return err;
  const emoji = encodeURIComponent(config.emoji.replace(/:/g, ""));
  await bot(token, "delete", `/channels/${config.channelId}/messages/${config.messageId}/reactions/${emoji}/@me`);
  return { ok: true, emoji: config.emoji, messageId: config.messageId, removed: true };
}

async function opCreateThread(config, token) {
  const err = need(config, ["channelId", "threadName"], "createThread"); if (err) return err;
  const body = { name: String(config.threadName).substring(0, 100), auto_archive_duration: Number(config.autoArchiveMinutes) || 1440, type: 11 };
  const path = config.messageId
    ? `/channels/${config.channelId}/messages/${config.messageId}/threads`
    : `/channels/${config.channelId}/threads`;
  const data = await bot(token, "post", path, body);
  return { ok: true, threadId: data.id, threadName: data.name };
}

export const messageOperations = {
  botSendMessage: opBotSendMessage,
  editMessage: opEditMessage,
  deleteMessage: opDeleteMessage,
  getMessages: opGetMessages,
  pinMessage: opPinMessage,
  unpinMessage: opUnpinMessage,
  addReaction: opAddReaction,
  removeReaction: opRemoveReaction,
  createThread: opCreateThread,
};

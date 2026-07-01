/**
 * Telegram — chat metadata, pins, reactions, actions, bot identity.
 * Handlers receive `(config, token)`.
 */
import { call, requireChat } from "../GenericFunctions.js";

async function opGetChat(config, token) {
  const { chatId, _err } = requireChat(config, "getChat");
  if (_err) return _err;
  const data = await call(token, "getChat", { chat_id: chatId });
  const chat = data.result;
  return {
    ok: data.ok, id: chat?.id, type: chat?.type, title: chat?.title,
    username: chat?.username, memberCount: chat?.member_count, description: chat?.description,
  };
}

async function opGetChatMemberCount(config, token) {
  const { chatId, _err } = requireChat(config, "getChatMemberCount");
  if (_err) return _err;
  const data = await call(token, "getChatMemberCount", { chat_id: chatId });
  return { ok: data.ok, count: data.result };
}

async function opGetChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "getChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram getChatMember: 'userId' is required.", skipped: true };
  const data = await call(token, "getChatMember", { chat_id: chatId, user_id: config.userId });
  const m = data.result;
  return { ok: data.ok, status: m?.status, user: m?.user, isAdmin: ["administrator", "creator"].includes(m?.status) };
}

async function opGetChatAdministrators(config, token) {
  const { chatId, _err } = requireChat(config, "getChatAdministrators");
  if (_err) return _err;
  const data = await call(token, "getChatAdministrators", { chat_id: chatId });
  return { ok: data.ok, count: (data.result || []).length, administrators: (data.result || []).map((a) => ({ status: a.status, user: a.user })) };
}

async function opPinMessage(config, token) {
  const { chatId, _err } = requireChat(config, "pinMessage");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram pinMessage: 'messageId' is required.", skipped: true };
  const data = await call(token, "pinChatMessage", { chat_id: chatId, message_id: config.messageId, disable_notification: config.silent || false });
  return { ok: data.ok, pinned: data.result === true };
}

async function opUnpinMessage(config, token) {
  const { chatId, _err } = requireChat(config, "unpinMessage");
  if (_err) return _err;
  const payload = { chat_id: chatId };
  if (config.messageId) payload.message_id = config.messageId;
  const data = await call(token, "unpinChatMessage", payload);
  return { ok: data.ok, unpinned: data.result === true };
}

async function opUnpinAllMessages(config, token) {
  const { chatId, _err } = requireChat(config, "unpinAllMessages");
  if (_err) return _err;
  const data = await call(token, "unpinAllChatMessages", { chat_id: chatId });
  return { ok: data.ok, unpinned: data.result === true };
}

async function opSendChatAction(config, token) {
  const { chatId, _err } = requireChat(config, "sendChatAction");
  if (_err) return _err;
  const data = await call(token, "sendChatAction", { chat_id: chatId, action: config.action || "typing" });
  return { ok: data.ok, sent: data.result === true };
}

async function opSetMessageReaction(config, token) {
  const { chatId, _err } = requireChat(config, "setMessageReaction");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram setMessageReaction: 'messageId' is required.", skipped: true };
  const reaction = config.reactionEmoji ? [{ type: "emoji", emoji: config.reactionEmoji }] : [];
  const data = await call(token, "setMessageReaction", { chat_id: chatId, message_id: config.messageId, reaction, is_big: config.bigReaction || false });
  return { ok: data.ok, reacted: data.result === true };
}

async function opGetMe(config, token) {
  const data = await call(token, "getMe", {});
  const bot = data.result;
  return { ok: data.ok, id: bot?.id, username: bot?.username, firstName: bot?.first_name, canJoinGroups: bot?.can_join_groups, supportsInline: bot?.supports_inline_queries };
}

export const chatOperations = {
  getChat: opGetChat,
  getChatMemberCount: opGetChatMemberCount,
  getChatMember: opGetChatMember,
  getChatAdministrators: opGetChatAdministrators,
  pinMessage: opPinMessage,
  unpinMessage: opUnpinMessage,
  unpinAllMessages: opUnpinAllMessages,
  sendChatAction: opSendChatAction,
  setMessageReaction: opSetMessageReaction,
  getMe: opGetMe,
};

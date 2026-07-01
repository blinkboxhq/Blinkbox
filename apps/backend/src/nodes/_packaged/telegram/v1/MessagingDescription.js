/**
 * Telegram — text, polls, dice, edits, deletes, copy/forward.
 * Handlers receive `(config, token)`.
 */
import { call, msgResult, requireChat } from "../GenericFunctions.js";

async function opSendMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : String(config.chatId ?? "");
  const text = typeof config.text === "string" ? config.text.trim() : config.text;
  if (!chatId) return { success: false, error: "Telegram sendMessage: 'chatId' is required. Leave it blank to auto-reply to the trigger sender.", skipped: true };
  if (!text) return { success: false, error: "Telegram sendMessage: 'text' is required.", skipped: true };

  const payload = { chat_id: chatId, text, disable_notification: config.silent || false };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  if (config.replyToMessageId) payload.reply_to_message_id = config.replyToMessageId;
  return msgResult(await call(token, "sendMessage", payload));
}

async function opSendPoll(config, token) {
  const { chatId, _err } = requireChat(config, "sendPoll");
  if (_err) return _err;
  if (!config.question) return { success: false, error: "Telegram sendPoll: 'question' is required.", skipped: true };
  if (!Array.isArray(config.options) || config.options.length < 2)
    throw new Error("Telegram sendPoll: 'options' must be an array with at least 2 items.");
  const data = await call(token, "sendPoll", {
    chat_id: chatId,
    question: config.question,
    options: config.options,
    is_anonymous: config.isAnonymous !== false,
    allows_multiple_answers: config.allowsMultiple || false,
  });
  const poll = data.result?.poll;
  return { ok: data.ok, messageId: data.result?.message_id, pollId: poll?.id, question: poll?.question, options: poll?.options };
}

async function opSendDice(config, token) {
  const { chatId, _err } = requireChat(config, "sendDice");
  if (_err) return _err;
  const data = await call(token, "sendDice", { chat_id: chatId, emoji: config.emoji || "🎲", disable_notification: config.silent || false });
  return { ok: data.ok, messageId: data.result?.message_id, value: data.result?.dice?.value, emoji: data.result?.dice?.emoji };
}

async function opSendLocation(config, token) {
  const { chatId, _err } = requireChat(config, "sendLocation");
  if (_err) return _err;
  if (config.latitude == null || config.longitude == null)
    return { success: false, error: "Telegram sendLocation: 'latitude' and 'longitude' are required.", skipped: true };
  return msgResult(await call(token, "sendLocation", {
    chat_id: chatId, latitude: Number(config.latitude), longitude: Number(config.longitude), disable_notification: config.silent || false,
  }));
}

async function opSendVenue(config, token) {
  const { chatId, _err } = requireChat(config, "sendVenue");
  if (_err) return _err;
  if (config.latitude == null || config.longitude == null || !config.title || !config.address)
    return { success: false, error: "Telegram sendVenue: latitude, longitude, title and address are required.", skipped: true };
  return msgResult(await call(token, "sendVenue", {
    chat_id: chatId, latitude: Number(config.latitude), longitude: Number(config.longitude), title: config.title, address: config.address,
  }));
}

async function opSendContact(config, token) {
  const { chatId, _err } = requireChat(config, "sendContact");
  if (_err) return _err;
  if (!config.phoneNumber || !config.firstName)
    return { success: false, error: "Telegram sendContact: 'phoneNumber' and 'firstName' are required.", skipped: true };
  return msgResult(await call(token, "sendContact", {
    chat_id: chatId, phone_number: config.phoneNumber, first_name: config.firstName, last_name: config.lastName || undefined,
  }));
}

async function opCopyMessage(config, token) {
  const { chatId, _err } = requireChat(config, "copyMessage");
  if (_err) return _err;
  if (!config.fromChatId || !config.messageId)
    return { success: false, error: "Telegram copyMessage: 'fromChatId' and 'messageId' are required.", skipped: true };
  const data = await call(token, "copyMessage", { chat_id: chatId, from_chat_id: config.fromChatId, message_id: config.messageId });
  return { ok: data.ok, messageId: data.result?.message_id };
}

async function opForwardMessage(config, token) {
  const { chatId, _err } = requireChat(config, "forwardMessage");
  if (_err) return _err;
  if (!config.fromChatId || !config.messageId)
    return { success: false, error: "Telegram forwardMessage: 'fromChatId' and 'messageId' are required.", skipped: true };
  return msgResult(await call(token, "forwardMessage", {
    chat_id: chatId, from_chat_id: config.fromChatId, message_id: config.messageId, disable_notification: config.silent || false,
  }));
}

async function opEditMessage(config, token) {
  const { chatId, _err } = requireChat(config, "editMessage");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram editMessage: 'messageId' is required.", skipped: true };
  if (!config.text) return { success: false, error: "Telegram editMessage: 'text' (new text) is required.", skipped: true };
  const payload = { chat_id: chatId, message_id: config.messageId, text: config.text };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  return msgResult(await call(token, "editMessageText", payload));
}

async function opEditMessageCaption(config, token) {
  const { chatId, _err } = requireChat(config, "editMessageCaption");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram editMessageCaption: 'messageId' is required.", skipped: true };
  const payload = { chat_id: chatId, message_id: config.messageId, caption: config.caption || "" };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  return msgResult(await call(token, "editMessageCaption", payload));
}

async function opDeleteMessage(config, token) {
  const { chatId, _err } = requireChat(config, "deleteMessage");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram deleteMessage: 'messageId' is required.", skipped: true };
  const data = await call(token, "deleteMessage", { chat_id: chatId, message_id: config.messageId });
  return { ok: data.ok, deleted: data.result === true };
}

export const messagingOperations = {
  sendMessage: opSendMessage,
  sendPoll: opSendPoll,
  sendDice: opSendDice,
  sendLocation: opSendLocation,
  sendVenue: opSendVenue,
  sendContact: opSendContact,
  copyMessage: opCopyMessage,
  forwardMessage: opForwardMessage,
  editMessage: opEditMessage,
  editMessageCaption: opEditMessageCaption,
  deleteMessage: opDeleteMessage,
};

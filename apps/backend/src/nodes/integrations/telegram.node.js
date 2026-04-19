/**
 * TELEGRAM NODE
 *
 * Operations:
 *   sendMessage   — Send a text message (default)
 *   sendPhoto     — Send an image by URL with optional caption
 *   sendDocument  — Send a file by URL with optional caption
 *   sendPoll      — Create a poll in a group/channel
 *   editMessage   — Edit a previously sent message
 *   deleteMessage — Delete a message
 *   pinMessage    — Pin a message in a chat
 *   getChat       — Fetch chat/group metadata
 *
 * Config (all ops):
 *   credentialId — Vault reference to Bot Token
 *   chatId       — Target chat/group/channel ID
 *   operation    — one of the above (default: "sendMessage")
 *
 * Output: varies by operation — see each handler below.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://api.telegram.org/bot";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Telegram");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message.startsWith("Telegram")) throw err;
  if (err.response?.status === 401) throw new Error("Telegram: Invalid Bot Token.");
  if (err.response?.status === 400)
    throw new Error(`Telegram: Bad request — ${err.response?.data?.description || err.message}`);
  if (err.response?.status === 403)
    throw new Error("Telegram: Bot is not a member of this chat or was blocked.");
  if (err.response?.status === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
  throw new Error(`Telegram failed: ${err.response?.status || err.code} — ${err.message}`);
}

function msgResult(data) {
  const msg = data.result;
  return {
    ok: data.ok,
    messageId: msg?.message_id,
    chat: {
      id: msg?.chat?.id,
      type: msg?.chat?.type,
      title: msg?.chat?.title || msg?.chat?.first_name,
    },
  };
}

async function call(token, method, payload) {
  const response = await axios.post(
    `${BASE_URL}${token}/${method}`,
    payload,
    { headers: { "Content-Type": "application/json" }, timeout: 15000 },
  );
  return response.data;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function opSendMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : String(config.chatId ?? "");
  const text = typeof config.text === "string" ? config.text.trim() : config.text;
  if (!chatId) throw new Error("Telegram sendMessage: 'chatId' is required. Leave it blank to auto-reply to the trigger sender.");
  if (!text) throw new Error("Telegram sendMessage: 'text' is required.");

  const payload = {
    chat_id: chatId,
    text,
    disable_notification: config.silent || false,
  };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  if (config.replyToMessageId) payload.reply_to_message_id = config.replyToMessageId;

  return msgResult(await call(token, "sendMessage", payload));
}

async function opSendPhoto(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  const photoUrl = config.photoUrl || config.imageUrl;
  if (!chatId) throw new Error("Telegram sendPhoto: 'chatId' is required.");
  if (!photoUrl) throw new Error("Telegram sendPhoto: 'photoUrl' is required.");
  if (!/^https?:\/\//i.test(photoUrl)) throw new Error("Telegram sendPhoto: 'photoUrl' must be an http/https URL.");

  const payload = { chat_id: chatId, photo: photoUrl };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  payload.disable_notification = config.silent || false;

  return msgResult(await call(token, "sendPhoto", payload));
}

async function opSendDocument(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  const documentUrl = config.documentUrl || config.fileUrl;
  if (!chatId) throw new Error("Telegram sendDocument: 'chatId' is required.");
  if (!documentUrl) throw new Error("Telegram sendDocument: 'documentUrl' is required.");
  if (!/^https?:\/\//i.test(documentUrl)) throw new Error("Telegram sendDocument: 'documentUrl' must be an http/https URL.");

  const payload = { chat_id: chatId, document: documentUrl };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  payload.disable_notification = config.silent || false;

  return msgResult(await call(token, "sendDocument", payload));
}

async function opSendPoll(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) throw new Error("Telegram sendPoll: 'chatId' is required.");
  if (!config.question) throw new Error("Telegram sendPoll: 'question' is required.");
  if (!Array.isArray(config.options) || config.options.length < 2)
    throw new Error("Telegram sendPoll: 'options' must be an array with at least 2 items.");

  const payload = {
    chat_id: chatId,
    question: config.question,
    options: config.options,
    is_anonymous: config.isAnonymous !== false,
    allows_multiple_answers: config.allowsMultiple || false,
  };

  const data = await call(token, "sendPoll", payload);
  const poll = data.result?.poll;
  return {
    ok: data.ok,
    messageId: data.result?.message_id,
    pollId: poll?.id,
    question: poll?.question,
    options: poll?.options,
  };
}

async function opEditMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) throw new Error("Telegram editMessage: 'chatId' is required.");
  if (!config.messageId) throw new Error("Telegram editMessage: 'messageId' is required.");
  if (!config.text) throw new Error("Telegram editMessage: 'text' (new text) is required.");

  const payload = {
    chat_id: chatId,
    message_id: config.messageId,
    text: config.text,
  };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;

  return msgResult(await call(token, "editMessageText", payload));
}

async function opDeleteMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) throw new Error("Telegram deleteMessage: 'chatId' is required.");
  if (!config.messageId) throw new Error("Telegram deleteMessage: 'messageId' is required.");

  const data = await call(token, "deleteMessage", { chat_id: chatId, message_id: config.messageId });
  return { ok: data.ok, deleted: data.result === true };
}

async function opPinMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) throw new Error("Telegram pinMessage: 'chatId' is required.");
  if (!config.messageId) throw new Error("Telegram pinMessage: 'messageId' is required.");

  const data = await call(token, "pinChatMessage", {
    chat_id: chatId,
    message_id: config.messageId,
    disable_notification: config.silent || false,
  });
  return { ok: data.ok, pinned: data.result === true };
}

async function opGetChat(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) throw new Error("Telegram getChat: 'chatId' is required.");

  const data = await call(token, "getChat", { chat_id: chatId });
  const chat = data.result;
  return {
    ok: data.ok,
    id: chat?.id,
    type: chat?.type,
    title: chat?.title,
    username: chat?.username,
    memberCount: chat?.member_count,
    description: chat?.description,
  };
}

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  sendMessage: opSendMessage,
  sendPhoto: opSendPhoto,
  sendDocument: opSendDocument,
  sendPoll: opSendPoll,
  editMessage: opEditMessage,
  deleteMessage: opDeleteMessage,
  pinMessage: opPinMessage,
  getChat: opGetChat,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Telegram: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);

    // If chatId is blank, reply to whoever triggered the workflow
    const resolvedConfig = { ...config };
    if (!resolvedConfig.chatId) {
      const triggerChat = context.triggerOutput?.chat?.id;
      if (triggerChat) resolvedConfig.chatId = String(triggerChat);
    }

    try {
      return await handler(resolvedConfig, token);
    } catch (err) {
      handleError(err);
    }
  },
};

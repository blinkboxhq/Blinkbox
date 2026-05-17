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
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.telegram.org/bot";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Telegram");
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
  if (!chatId) return { success: false, error: "Telegram sendMessage: 'chatId' is required. Leave it blank to auto-reply to the trigger sender.", skipped: true };
  if (!text) return { success: false, error: "Telegram sendMessage: 'text' is required.", skipped: true };

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
  if (!chatId) return { success: false, error: "Telegram sendPhoto: 'chatId' is required.", skipped: true };

  // Inline binary upload (from AI Agent forwarded attachments)
  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", new Blob([Buffer.from(base64Data, "base64")], { type: mimeType || "image/jpeg" }), name || "photo.jpg");
    if (config.caption) form.append("caption", config.caption);
    const res = await axios.post(`${BASE_URL}${token}/sendPhoto`, form, { timeout: 30000 });
    return msgResult(res.data);
  }

  const photoUrl = config.photoUrl || config.imageUrl;
  if (!photoUrl) return { success: false, error: "Telegram sendPhoto: 'photoUrl' or attachmentIndex is required.", skipped: true };
  if (!/^https?:\/\//i.test(photoUrl)) throw new Error("Telegram sendPhoto: 'photoUrl' must be an http/https URL.");

  const payload = { chat_id: chatId, photo: photoUrl };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  payload.disable_notification = config.silent || false;

  return msgResult(await call(token, "sendPhoto", payload));
}

async function opSendDocument(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) return { success: false, error: "Telegram sendDocument: 'chatId' is required.", skipped: true };

  // Inline binary upload (from AI Agent forwarded attachments)
  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("document", new Blob([Buffer.from(base64Data, "base64")], { type: mimeType || "application/octet-stream" }), name || "file");
    if (config.caption) form.append("caption", config.caption);
    const res = await axios.post(`${BASE_URL}${token}/sendDocument`, form, { timeout: 30000 });
    return msgResult(res.data);
  }

  const documentUrl = config.documentUrl || config.fileUrl;
  if (!documentUrl) return { success: false, error: "Telegram sendDocument: 'documentUrl' or attachmentIndex is required.", skipped: true };
  if (!/^https?:\/\//i.test(documentUrl)) throw new Error("Telegram sendDocument: 'documentUrl' must be an http/https URL.");

  const payload = { chat_id: chatId, document: documentUrl };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  payload.disable_notification = config.silent || false;

  return msgResult(await call(token, "sendDocument", payload));
}

async function opSendPoll(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) return { success: false, error: "Telegram sendPoll: 'chatId' is required.", skipped: true };
  if (!config.question) return { success: false, error: "Telegram sendPoll: 'question' is required.", skipped: true };
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
  if (!chatId) return { success: false, error: "Telegram editMessage: 'chatId' is required.", skipped: true };
  if (!config.messageId) return { success: false, error: "Telegram editMessage: 'messageId' is required.", skipped: true };
  if (!config.text) return { success: false, error: "Telegram editMessage: 'text' (new text) is required.", skipped: true };

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
  if (!chatId) return { success: false, error: "Telegram deleteMessage: 'chatId' is required.", skipped: true };
  if (!config.messageId) return { success: false, error: "Telegram deleteMessage: 'messageId' is required.", skipped: true };

  const data = await call(token, "deleteMessage", { chat_id: chatId, message_id: config.messageId });
  return { ok: data.ok, deleted: data.result === true };
}

async function opPinMessage(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) return { success: false, error: "Telegram pinMessage: 'chatId' is required.", skipped: true };
  if (!config.messageId) return { success: false, error: "Telegram pinMessage: 'messageId' is required.", skipped: true };

  const data = await call(token, "pinChatMessage", {
    chat_id: chatId,
    message_id: config.messageId,
    disable_notification: config.silent || false,
  });
  return { ok: data.ok, pinned: data.result === true };
}

async function opGetChat(config, token) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : config.chatId;
  if (!chatId) return { success: false, error: "Telegram getChat: 'chatId' is required.", skipped: true };

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

    const resolvedConfig = { ...config };

    // If chatId is blank, reply to whoever triggered the workflow
    if (!resolvedConfig.chatId) {
      const triggerChat = context.triggerOutput?.chat?.id;
      if (triggerChat) resolvedConfig.chatId = String(triggerChat);
    }

    // Allow forwarding attachments from previous node output (standalone canvas use)
    if (typeof config.attachmentIndex === "number" && !resolvedConfig._inlineAttachment) {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) resolvedConfig._inlineAttachment = att;
    }

    try {
      return await handler(resolvedConfig, token);
    } catch (err) {
      handleError(err);
    }
  },
};

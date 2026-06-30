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
  if (err.response?.status === 404)
    throw new Error("Telegram: Bot Token is invalid or the API method was not found.");
  if (err.response?.status === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
  if (err.response?.status === 500) throw new Error("Telegram: Telegram server error (500). Retry later.");
  if (err.code === "ECONNABORTED") throw new Error("Telegram: Request timed out.");
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
  const data = response.data;
  if (!data.ok) {
    const code = data.error_code;
    const desc = data.description || "Unknown error";
    if (code === 401) throw new Error("Telegram: Invalid Bot Token.");
    if (code === 400) throw new Error(`Telegram: Bad request — ${desc}`);
    if (code === 403) throw new Error(`Telegram: Forbidden — ${desc}`);
    if (code === 404) throw new Error(`Telegram: Not found — ${desc}`);
    if (code === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
    throw new Error(`Telegram API error ${code}: ${desc}`);
  }
  return data;
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

function requireChat(config, op) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : (config.chatId != null ? String(config.chatId) : "");
  if (!chatId) return { _err: { success: false, error: `Telegram ${op}: 'chatId' is required.`, skipped: true } };
  return { chatId };
}

async function sendMediaByUrlOrInline(config, token, method, field, mimeDefault, fileNameDefault) {
  const { chatId, _err } = requireChat(config, method);
  if (_err) return _err;

  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(field, new Blob([Buffer.from(base64Data, "base64")], { type: mimeType || mimeDefault }), name || fileNameDefault);
    if (config.caption) form.append("caption", config.caption);
    const res = await axios.post(`${BASE_URL}${token}/${method}`, form, { timeout: 60000 });
    return msgResult(res.data);
  }

  const url = config.fileUrl || config.url || config[field + "Url"];
  if (!url) return { success: false, error: `Telegram ${method}: a file URL or attachment is required.`, skipped: true };
  if (!/^https?:\/\//i.test(url)) throw new Error(`Telegram ${method}: file URL must be http/https.`);

  const payload = { chat_id: chatId, [field]: url, disable_notification: config.silent || false };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  if (config.duration) payload.duration = Number(config.duration);
  if (config.title) payload.title = config.title;
  if (config.performer) payload.performer = config.performer;
  return msgResult(await call(token, method, payload));
}

async function opSendVideo(config, token) {
  return sendMediaByUrlOrInline(config, token, "sendVideo", "video", "video/mp4", "video.mp4");
}
async function opSendAudio(config, token) {
  return sendMediaByUrlOrInline(config, token, "sendAudio", "audio", "audio/mpeg", "audio.mp3");
}
async function opSendVoice(config, token) {
  return sendMediaByUrlOrInline(config, token, "sendVoice", "voice", "audio/ogg", "voice.ogg");
}
async function opSendAnimation(config, token) {
  return sendMediaByUrlOrInline(config, token, "sendAnimation", "animation", "video/mp4", "animation.mp4");
}

async function opSendSticker(config, token) {
  const { chatId, _err } = requireChat(config, "sendSticker");
  if (_err) return _err;
  const sticker = config.sticker || config.fileUrl || config.fileId;
  if (!sticker) return { success: false, error: "Telegram sendSticker: 'sticker' (file ID or URL) is required.", skipped: true };
  return msgResult(await call(token, "sendSticker", { chat_id: chatId, sticker, disable_notification: config.silent || false }));
}

async function opSendLocation(config, token) {
  const { chatId, _err } = requireChat(config, "sendLocation");
  if (_err) return _err;
  if (config.latitude == null || config.longitude == null)
    return { success: false, error: "Telegram sendLocation: 'latitude' and 'longitude' are required.", skipped: true };
  return msgResult(await call(token, "sendLocation", {
    chat_id: chatId,
    latitude: Number(config.latitude),
    longitude: Number(config.longitude),
    disable_notification: config.silent || false,
  }));
}

async function opSendVenue(config, token) {
  const { chatId, _err } = requireChat(config, "sendVenue");
  if (_err) return _err;
  if (config.latitude == null || config.longitude == null || !config.title || !config.address)
    return { success: false, error: "Telegram sendVenue: latitude, longitude, title and address are required.", skipped: true };
  return msgResult(await call(token, "sendVenue", {
    chat_id: chatId,
    latitude: Number(config.latitude),
    longitude: Number(config.longitude),
    title: config.title,
    address: config.address,
  }));
}

async function opSendContact(config, token) {
  const { chatId, _err } = requireChat(config, "sendContact");
  if (_err) return _err;
  if (!config.phoneNumber || !config.firstName)
    return { success: false, error: "Telegram sendContact: 'phoneNumber' and 'firstName' are required.", skipped: true };
  return msgResult(await call(token, "sendContact", {
    chat_id: chatId,
    phone_number: config.phoneNumber,
    first_name: config.firstName,
    last_name: config.lastName || undefined,
  }));
}

async function opSendDice(config, token) {
  const { chatId, _err } = requireChat(config, "sendDice");
  if (_err) return _err;
  const data = await call(token, "sendDice", {
    chat_id: chatId,
    emoji: config.emoji || "🎲",
    disable_notification: config.silent || false,
  });
  return { ok: data.ok, messageId: data.result?.message_id, value: data.result?.dice?.value, emoji: data.result?.dice?.emoji };
}

async function opSendMediaGroup(config, token) {
  const { chatId, _err } = requireChat(config, "sendMediaGroup");
  if (_err) return _err;
  let media = config.media;
  if (typeof media === "string") { try { media = JSON.parse(media); } catch { media = null; } }
  if (!Array.isArray(media) || media.length < 2)
    return { success: false, error: "Telegram sendMediaGroup: 'media' must be an array of 2–10 items.", skipped: true };
  const data = await call(token, "sendMediaGroup", { chat_id: chatId, media });
  return { ok: data.ok, count: Array.isArray(data.result) ? data.result.length : 0, messageIds: (data.result || []).map((m) => m.message_id) };
}

async function opCopyMessage(config, token) {
  const { chatId, _err } = requireChat(config, "copyMessage");
  if (_err) return _err;
  if (!config.fromChatId || !config.messageId)
    return { success: false, error: "Telegram copyMessage: 'fromChatId' and 'messageId' are required.", skipped: true };
  const data = await call(token, "copyMessage", {
    chat_id: chatId,
    from_chat_id: config.fromChatId,
    message_id: config.messageId,
  });
  return { ok: data.ok, messageId: data.result?.message_id };
}

async function opForwardMessage(config, token) {
  const { chatId, _err } = requireChat(config, "forwardMessage");
  if (_err) return _err;
  if (!config.fromChatId || !config.messageId)
    return { success: false, error: "Telegram forwardMessage: 'fromChatId' and 'messageId' are required.", skipped: true };
  return msgResult(await call(token, "forwardMessage", {
    chat_id: chatId,
    from_chat_id: config.fromChatId,
    message_id: config.messageId,
    disable_notification: config.silent || false,
  }));
}

async function opEditMessageCaption(config, token) {
  const { chatId, _err } = requireChat(config, "editMessageCaption");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram editMessageCaption: 'messageId' is required.", skipped: true };
  const payload = { chat_id: chatId, message_id: config.messageId, caption: config.caption || "" };
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  return msgResult(await call(token, "editMessageCaption", payload));
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

async function opSetChatTitle(config, token) {
  const { chatId, _err } = requireChat(config, "setChatTitle");
  if (_err) return _err;
  if (!config.title) return { success: false, error: "Telegram setChatTitle: 'title' is required.", skipped: true };
  const data = await call(token, "setChatTitle", { chat_id: chatId, title: config.title });
  return { ok: data.ok, updated: data.result === true };
}

async function opSetChatDescription(config, token) {
  const { chatId, _err } = requireChat(config, "setChatDescription");
  if (_err) return _err;
  const data = await call(token, "setChatDescription", { chat_id: chatId, description: config.description || "" });
  return { ok: data.ok, updated: data.result === true };
}

async function opLeaveChat(config, token) {
  const { chatId, _err } = requireChat(config, "leaveChat");
  if (_err) return _err;
  const data = await call(token, "leaveChat", { chat_id: chatId });
  return { ok: data.ok, left: data.result === true };
}

async function opBanChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "banChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram banChatMember: 'userId' is required.", skipped: true };
  const payload = { chat_id: chatId, user_id: config.userId };
  if (config.untilDate) payload.until_date = Number(config.untilDate);
  if (config.revokeMessages) payload.revoke_messages = true;
  const data = await call(token, "banChatMember", payload);
  return { ok: data.ok, banned: data.result === true };
}

async function opUnbanChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "unbanChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram unbanChatMember: 'userId' is required.", skipped: true };
  const data = await call(token, "unbanChatMember", { chat_id: chatId, user_id: config.userId, only_if_banned: config.onlyIfBanned !== false });
  return { ok: data.ok, unbanned: data.result === true };
}

async function opRestrictChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "restrictChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram restrictChatMember: 'userId' is required.", skipped: true };
  const permissions = {
    can_send_messages: config.canSendMessages || false,
    can_send_media_messages: config.canSendMedia || false,
    can_send_polls: config.canSendPolls || false,
    can_send_other_messages: config.canSendOther || false,
    can_add_web_page_previews: config.canAddPreviews || false,
  };
  const payload = { chat_id: chatId, user_id: config.userId, permissions };
  if (config.untilDate) payload.until_date = Number(config.untilDate);
  const data = await call(token, "restrictChatMember", payload);
  return { ok: data.ok, restricted: data.result === true };
}

async function opPromoteChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "promoteChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram promoteChatMember: 'userId' is required.", skipped: true };
  const data = await call(token, "promoteChatMember", {
    chat_id: chatId,
    user_id: config.userId,
    can_manage_chat: config.canManageChat || false,
    can_delete_messages: config.canDeleteMessages || false,
    can_restrict_members: config.canRestrictMembers || false,
    can_promote_members: config.canPromoteMembers || false,
    can_change_info: config.canChangeInfo || false,
    can_invite_users: config.canInviteUsers || false,
    can_pin_messages: config.canPinMessages || false,
  });
  return { ok: data.ok, promoted: data.result === true };
}

async function opCreateInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "createInviteLink");
  if (_err) return _err;
  const payload = { chat_id: chatId };
  if (config.inviteName) payload.name = config.inviteName;
  if (config.expireDate) payload.expire_date = Number(config.expireDate);
  if (config.memberLimit) payload.member_limit = Number(config.memberLimit);
  if (config.createsJoinRequest) payload.creates_join_request = true;
  const data = await call(token, "createChatInviteLink", payload);
  return { ok: data.ok, inviteLink: data.result?.invite_link, name: data.result?.name, expireDate: data.result?.expire_date };
}

async function opRevokeInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "revokeInviteLink");
  if (_err) return _err;
  if (!config.inviteLink) return { success: false, error: "Telegram revokeInviteLink: 'inviteLink' is required.", skipped: true };
  const data = await call(token, "revokeChatInviteLink", { chat_id: chatId, invite_link: config.inviteLink });
  return { ok: data.ok, inviteLink: data.result?.invite_link, revoked: data.result?.is_revoked };
}

async function opExportInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "exportInviteLink");
  if (_err) return _err;
  const data = await call(token, "exportChatInviteLink", { chat_id: chatId });
  return { ok: data.ok, inviteLink: data.result };
}

async function opSetMessageReaction(config, token) {
  const { chatId, _err } = requireChat(config, "setMessageReaction");
  if (_err) return _err;
  if (!config.messageId) return { success: false, error: "Telegram setMessageReaction: 'messageId' is required.", skipped: true };
  const reaction = config.reactionEmoji ? [{ type: "emoji", emoji: config.reactionEmoji }] : [];
  const data = await call(token, "setMessageReaction", {
    chat_id: chatId,
    message_id: config.messageId,
    reaction,
    is_big: config.bigReaction || false,
  });
  return { ok: data.ok, reacted: data.result === true };
}

async function opGetMe(config, token) {
  const data = await call(token, "getMe", {});
  const bot = data.result;
  return { ok: data.ok, id: bot?.id, username: bot?.username, firstName: bot?.first_name, canJoinGroups: bot?.can_join_groups, supportsInline: bot?.supports_inline_queries };
}

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  sendMessage: opSendMessage,
  sendPhoto: opSendPhoto,
  sendDocument: opSendDocument,
  sendVideo: opSendVideo,
  sendAudio: opSendAudio,
  sendVoice: opSendVoice,
  sendAnimation: opSendAnimation,
  sendSticker: opSendSticker,
  sendLocation: opSendLocation,
  sendVenue: opSendVenue,
  sendContact: opSendContact,
  sendPoll: opSendPoll,
  sendDice: opSendDice,
  sendMediaGroup: opSendMediaGroup,
  copyMessage: opCopyMessage,
  forwardMessage: opForwardMessage,
  editMessage: opEditMessage,
  editMessageCaption: opEditMessageCaption,
  deleteMessage: opDeleteMessage,
  pinMessage: opPinMessage,
  unpinMessage: opUnpinMessage,
  unpinAllMessages: opUnpinAllMessages,
  sendChatAction: opSendChatAction,
  getChat: opGetChat,
  getChatMemberCount: opGetChatMemberCount,
  getChatMember: opGetChatMember,
  getChatAdministrators: opGetChatAdministrators,
  setChatTitle: opSetChatTitle,
  setChatDescription: opSetChatDescription,
  leaveChat: opLeaveChat,
  banChatMember: opBanChatMember,
  unbanChatMember: opUnbanChatMember,
  restrictChatMember: opRestrictChatMember,
  promoteChatMember: opPromoteChatMember,
  createInviteLink: opCreateInviteLink,
  revokeInviteLink: opRevokeInviteLink,
  exportInviteLink: opExportInviteLink,
  setMessageReaction: opSetMessageReaction,
  getMe: opGetMe,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Telegram: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) {
      return { success: false, error: "Telegram: No credential selected — pick a Telegram Bot Token credential.", skipped: true };
    }
    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Telegram: Could not resolve credential — ${e.message}`, skipped: true };
    }

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

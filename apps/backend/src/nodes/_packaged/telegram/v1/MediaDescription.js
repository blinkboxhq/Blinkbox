/**
 * Telegram — photo, document, video, audio, voice, animation, sticker,
 * media groups. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE_URL, attachmentTooLarge, call, msgResult, requireChat, sendMediaByUrlOrInline } from "../GenericFunctions.js";

async function opSendPhoto(config, token) {
  const { chatId, _err } = requireChat(config, "sendPhoto");
  if (_err) return _err;

  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const tooBig = attachmentTooLarge(base64Data, "sendPhoto");
    if (tooBig) return tooBig;
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
  const payload = { chat_id: chatId, photo: photoUrl, disable_notification: config.silent || false };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  return msgResult(await call(token, "sendPhoto", payload));
}

async function opSendDocument(config, token) {
  const { chatId, _err } = requireChat(config, "sendDocument");
  if (_err) return _err;

  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const tooBig = attachmentTooLarge(base64Data, "sendDocument");
    if (tooBig) return tooBig;
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
  const payload = { chat_id: chatId, document: documentUrl, disable_notification: config.silent || false };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  return msgResult(await call(token, "sendDocument", payload));
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

export const mediaOperations = {
  sendPhoto: opSendPhoto,
  sendDocument: opSendDocument,
  sendVideo: opSendVideo,
  sendAudio: opSendAudio,
  sendVoice: opSendVoice,
  sendAnimation: opSendAnimation,
  sendSticker: opSendSticker,
  sendMediaGroup: opSendMediaGroup,
};

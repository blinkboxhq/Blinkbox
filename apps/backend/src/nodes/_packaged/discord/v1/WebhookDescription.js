/**
 * Discord — webhook transport: sendMessage / sendEmbed / sendFile.
 * Handlers receive `(config)` only — no bot token; the webhook URL carries auth.
 */
import axios from "axios";
import { validateWebhook, webhookId, post, buildEmbed } from "../GenericFunctions.js";

async function opSendMessage(config) {
  const { webhookUrl, message, username, avatarUrl } = config;
  validateWebhook(webhookUrl);
  if (!message) return { success: false, error: "Discord sendMessage: 'message' is required (max 2000 chars).", skipped: true };
  if (message.length > 2000) throw new Error("Discord sendMessage: message exceeds 2000 characters.");

  const payload = { content: message };
  if (username) payload.username = username;
  if (avatarUrl) payload.avatar_url = avatarUrl;

  await post(webhookUrl, payload);
  return { ok: true, webhookId: webhookId(webhookUrl) };
}

async function opSendEmbed(config) {
  const { webhookUrl, username, avatarUrl } = config;
  validateWebhook(webhookUrl);

  const embed = buildEmbed(config);
  if (!embed.title && !embed.description && !embed.fields)
    return { success: false, error: "Discord sendEmbed: at least one of 'title', 'description', or 'fields' is required.", skipped: true };

  const payload = { embeds: [embed] };
  if (username) payload.username = username;
  if (avatarUrl) payload.avatar_url = avatarUrl;
  if (config.content) payload.content = config.content;

  await post(webhookUrl, payload);
  return { ok: true, webhookId: webhookId(webhookUrl) };
}

async function opSendFile(config) {
  const { webhookUrl, username } = config;
  validateWebhook(webhookUrl);

  const form = new FormData();
  if (config.message) form.append("content", config.message);
  if (username) form.append("username", username);

  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    form.append("file", new Blob([Buffer.from(base64Data, "base64")], { type: mimeType || "application/octet-stream" }), name || "file");
  } else {
    const content = config.content || config.fileContent || config.text;
    if (!content) return { success: false, error: "Discord sendFile: 'content' or an attachment is required.", skipped: true };
    form.append("file", new Blob([content], { type: "text/plain" }), config.filename || "output.txt");
  }

  const response = await axios.post(webhookUrl, form, { timeout: 30000, validateStatus: null });
  if (response.status >= 200 && response.status < 300) {
    return { ok: true, webhookId: webhookId(webhookUrl) };
  }
  throw new Error(`Discord sendFile failed: ${response.status} — ${response.data?.message || "unknown"}`);
}

export const webhookOperations = {
  sendMessage: opSendMessage,
  sendEmbed: opSendEmbed,
  sendFile: opSendFile,
};

export const WEBHOOK_OP_NAMES = Object.keys(webhookOperations);

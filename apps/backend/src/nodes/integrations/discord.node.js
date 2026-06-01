/**
 * DISCORD NODE
 *
 * Operations:
 *   sendMessage — Send plain text via webhook (default)
 *   sendEmbed   — Send a rich embed (title, description, fields, color, thumbnail)
 *   sendFile    — Attach a text/code file to a message
 *
 * Config (all ops):
 *   webhookUrl — Discord webhook URL (required)
 *   operation  — one of the above (default: "sendMessage")
 *   username   — Bot name override (optional)
 *   avatarUrl  — Bot avatar URL override (optional)
 */

import axios from "axios";

const DISCORD_WEBHOOK_RE = /^https:\/\/discord\.com\/api\/webhooks\//;

function validateWebhook(url) {
  if (!url) return { success: false, error: "Discord: 'webhookUrl' is required.", skipped: true };
  if (!DISCORD_WEBHOOK_RE.test(url))
    throw new Error("Discord: Invalid webhook URL. Must start with https://discord.com/api/webhooks/");
}

function webhookId(url) {
  const parts = url.split("/");
  return parts[6] || parts[5] || null;
}

async function post(webhookUrl, payload) {
  const response = await axios.post(webhookUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    validateStatus: null,
  });

  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  const errMsg = response.data?.message || response.statusText || "Unknown error";
  const errCode = response.data?.code || response.status;

  if (response.status === 401 || response.status === 403)
    throw new Error(`Discord: Webhook unauthorized (${errCode}). It may have been deleted — recreate it in Server Settings → Integrations.`);
  if (response.status === 404)
    throw new Error("Discord: Webhook not found. It may have been deleted.");
  if (response.status === 429)
    throw new Error("Discord: Rate limit exceeded. Add a Delay node or reduce frequency.");
  if (response.status === 400)
    throw new Error(`Discord: Bad request — ${errMsg}`);
  throw new Error(`Discord failed: ${response.status} — ${errMsg}`);
}

// ── Handlers ────────────────────────────────────────────────────────────────

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

  const embed = {};

  if (config.title) embed.title = config.title;
  if (config.description) embed.description = config.description;
  if (config.url) embed.url = config.url;
  if (config.color !== undefined) {
    // Accept hex string like "#5865F2" or decimal int
    embed.color = typeof config.color === "string"
      ? parseInt(config.color.replace("#", ""), 16)
      : config.color;
  } else {
    embed.color = 0x5865F2; // Discord blurple default
  }
  if (config.thumbnailUrl) embed.thumbnail = { url: config.thumbnailUrl };
  if (config.imageUrl) embed.image = { url: config.imageUrl };
  if (config.footerText) embed.footer = { text: config.footerText, icon_url: config.footerIconUrl };
  if (config.authorName) embed.author = { name: config.authorName, url: config.authorUrl, icon_url: config.authorIconUrl };
  if (config.timestamp !== false) embed.timestamp = new Date().toISOString();

  // fields: array of { name, value, inline }
  if (Array.isArray(config.fields) && config.fields.length > 0) {
    embed.fields = config.fields.slice(0, 25).map((f) => ({
      name: String(f.name || "Field").substring(0, 256),
      value: String(f.value || "\u200b").substring(0, 1024),
      inline: f.inline !== false,
    }));
  }

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
  const { webhookUrl, username, avatarUrl } = config;
  validateWebhook(webhookUrl);

  const form = new FormData();
  if (config.message) form.append("content", config.message);
  if (username) form.append("username", username);

  // Binary attachment (from AI Agent or previous node)
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

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  sendMessage: opSendMessage,
  sendEmbed: opSendEmbed,
  sendFile: opSendFile,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Discord: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    // Resolve webhook URL from credential or direct config
    let resolvedConfig = { ...config };
    if (config.credentialId && context.getCredential) {
      const cred = await context.getCredential(config.credentialId);
      // Credential value is the webhook URL stored as the "token" or "url" field
      resolvedConfig.webhookUrl = cred?.token || cred?.url || cred?.webhookUrl || cred?.value || config.webhookUrl;
    }

    if (operation === "sendFile" && typeof config.attachmentIndex === "number" && !config._inlineAttachment) {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) resolvedConfig = { ...resolvedConfig, _inlineAttachment: att };
    }

    try {
      return await handler(resolvedConfig);
    } catch (err) {
      if (err.message.startsWith("Discord")) throw err;
      throw new Error(`Discord failed: ${err.code || "UNKNOWN"} — ${err.message}`);
    }
  },
};

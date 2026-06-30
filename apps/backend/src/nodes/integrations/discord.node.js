/**
 * DISCORD NODE
 *
 * Two transports:
 *   Webhook  — sendMessage / sendEmbed / sendFile (no bot token, uses webhookUrl)
 *   Bot REST — everything else, via https://discord.com/api/v10 with a Bot token
 *              credential (Authorization: Bot <token>)
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://discord.com/api/v10";
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

// ── Bot REST helper ───────────────────────────────────────────────────────────

async function bot(token, method, path, data, params) {
  const response = await axios({
    method,
    url: `${API}${path}`,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    data,
    params,
    timeout: 15000,
    validateStatus: null,
  });
  if (response.status >= 200 && response.status < 300) return response.data;
  const msg = response.data?.message || response.statusText || "Unknown error";
  if (response.status === 401) throw new Error("Discord: Invalid or expired Bot token.");
  if (response.status === 403) throw new Error(`Discord: Bot lacks permission (403) — ${msg}. Check the bot's role permissions.`);
  if (response.status === 404) throw new Error(`Discord: Not found (404) — ${msg}.`);
  if (response.status === 429) throw new Error("Discord: Rate limit exceeded. Add a Delay node or reduce frequency.");
  if (response.status === 400) throw new Error(`Discord: Bad request — ${msg}`);
  throw new Error(`Discord failed: ${response.status} — ${msg}`);
}

function need(config, fields, op) {
  for (const f of fields) {
    if (!config[f]) return { success: false, error: `Discord ${op}: '${f}' is required.`, skipped: true };
  }
  return null;
}

function buildEmbed(config) {
  const embed = {};
  if (config.title) embed.title = config.title;
  if (config.description) embed.description = config.description;
  if (config.url) embed.url = config.url;
  embed.color = config.color !== undefined
    ? (typeof config.color === "string" ? parseInt(config.color.replace("#", ""), 16) : config.color)
    : 0x5865F2;
  if (config.thumbnailUrl) embed.thumbnail = { url: config.thumbnailUrl };
  if (config.imageUrl) embed.image = { url: config.imageUrl };
  if (config.footerText) embed.footer = { text: config.footerText, icon_url: config.footerIconUrl };
  if (config.authorName) embed.author = { name: config.authorName, url: config.authorUrl, icon_url: config.authorIconUrl };
  if (config.timestamp !== false) embed.timestamp = new Date().toISOString();
  if (Array.isArray(config.fields) && config.fields.length > 0) {
    embed.fields = config.fields.slice(0, 25).map((f) => ({
      name: String(f.name || "Field").substring(0, 256),
      value: String(f.value || "​").substring(0, 1024),
      inline: f.inline !== false,
    }));
  }
  return embed;
}

// ── Webhook handlers ──────────────────────────────────────────────────────────

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

// ── Bot: messages ─────────────────────────────────────────────────────────────

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

// ── Bot: channels ─────────────────────────────────────────────────────────────

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

// ── Bot: members & roles ──────────────────────────────────────────────────────

async function opAddRole(config, token) {
  const err = need(config, ["guildId", "userId", "roleId"], "addRole"); if (err) return err;
  await bot(token, "put", `/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`);
  return { ok: true, userId: config.userId, roleId: config.roleId, added: true };
}

async function opRemoveRole(config, token) {
  const err = need(config, ["guildId", "userId", "roleId"], "removeRole"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/members/${config.userId}/roles/${config.roleId}`);
  return { ok: true, userId: config.userId, roleId: config.roleId, removed: true };
}

async function opKickMember(config, token) {
  const err = need(config, ["guildId", "userId"], "kickMember"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/members/${config.userId}`);
  return { ok: true, userId: config.userId, kicked: true };
}

async function opBanMember(config, token) {
  const err = need(config, ["guildId", "userId"], "banMember"); if (err) return err;
  const body = {};
  if (config.deleteMessageSeconds) body.delete_message_seconds = Number(config.deleteMessageSeconds);
  await bot(token, "put", `/guilds/${config.guildId}/bans/${config.userId}`, body);
  return { ok: true, userId: config.userId, banned: true };
}

async function opUnbanMember(config, token) {
  const err = need(config, ["guildId", "userId"], "unbanMember"); if (err) return err;
  await bot(token, "delete", `/guilds/${config.guildId}/bans/${config.userId}`);
  return { ok: true, userId: config.userId, unbanned: true };
}

async function opGetMember(config, token) {
  const err = need(config, ["guildId", "userId"], "getMember"); if (err) return err;
  const m = await bot(token, "get", `/guilds/${config.guildId}/members/${config.userId}`);
  return { ok: true, userId: m.user?.id, username: m.user?.username, nick: m.nick, roles: m.roles, joinedAt: m.joined_at };
}

async function opListMembers(config, token) {
  const err = need(config, ["guildId"], "listMembers"); if (err) return err;
  const data = await bot(token, "get", `/guilds/${config.guildId}/members`, null, { limit: Math.min(Number(config.limit) || 100, 1000) });
  return { ok: true, count: data.length, members: data.map((m) => ({ userId: m.user?.id, username: m.user?.username, nick: m.nick, roles: m.roles })) };
}

async function opGetGuild(config, token) {
  const err = need(config, ["guildId"], "getGuild"); if (err) return err;
  const g = await bot(token, "get", `/guilds/${config.guildId}`, null, { with_counts: true });
  return { ok: true, id: g.id, name: g.name, ownerId: g.owner_id, memberCount: g.approximate_member_count, description: g.description };
}

async function opListRoles(config, token) {
  const err = need(config, ["guildId"], "listRoles"); if (err) return err;
  const data = await bot(token, "get", `/guilds/${config.guildId}/roles`);
  return { ok: true, count: data.length, roles: data.map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position })) };
}

// ── Operations map ───────────────────────────────────────────────────────────

const WEBHOOK_OPS = new Set(["sendMessage", "sendEmbed", "sendFile"]);

const OPERATIONS = {
  sendMessage: opSendMessage,
  sendEmbed: opSendEmbed,
  sendFile: opSendFile,
  botSendMessage: opBotSendMessage,
  editMessage: opEditMessage,
  deleteMessage: opDeleteMessage,
  getMessages: opGetMessages,
  pinMessage: opPinMessage,
  unpinMessage: opUnpinMessage,
  addReaction: opAddReaction,
  removeReaction: opRemoveReaction,
  createThread: opCreateThread,
  createChannel: opCreateChannel,
  listChannels: opListChannels,
  getChannel: opGetChannel,
  addRole: opAddRole,
  removeRole: opRemoveRole,
  kickMember: opKickMember,
  banMember: opBanMember,
  unbanMember: opUnbanMember,
  getMember: opGetMember,
  listMembers: opListMembers,
  getGuild: opGetGuild,
  listRoles: opListRoles,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Discord: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    // ── Webhook transport ──
    if (WEBHOOK_OPS.has(operation)) {
      let resolvedConfig = { ...config };
      if (config.credentialId && context.getCredential) {
        const cred = await context.getCredential(config.credentialId);
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
    }

    // ── Bot REST transport ──
    if (!config.credentialId) {
      return { success: false, error: "Discord: No credential selected — pick a Discord Bot Token credential.", skipped: true };
    }
    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Discord");
    } catch (e) {
      return { success: false, error: `Discord: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, token);
    } catch (err) {
      if (err.message.startsWith("Discord")) throw err;
      if (err.code === "ECONNABORTED") throw new Error("Discord: Request timed out.");
      throw new Error(`Discord failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};

/**
 * SLACK NODE
 *
 * Operations:
 *   postMessage    — Send a plain text message (default)
 *   postRichMessage — Send a Block Kit message (sections, buttons, fields)
 *   uploadFile     — Upload a text/code snippet as a file
 *   getUser        — Look up a Slack user by email
 *   createChannel  — Create a public or private channel
 *   inviteToChannel — Invite a user to a channel
 *   setTopic       — Set a channel topic
 *   addReaction    — Add an emoji reaction to a message
 *
 * Config (all ops):
 *   credentialId — Vault reference to Slack Bot Token (xoxb-...)
 *   operation    — one of the above (default: "postMessage")
 *
 * Note: webhookUrl mode (legacy) still works for postMessage only.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://slack.com/api";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Slack");
}

async function slackCall(token, method, payload) {
  let response;
  try {
    response = await axios.post(`${API}/${method}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      timeout: 15000,
    });
  } catch (err) {
    if (err.response?.status === 401) throw new Error("Slack: Invalid or expired Bot Token.");
    if (err.response?.status === 403) throw new Error("Slack: Bot lacks permission for this action. Check OAuth scopes.");
    if (err.response?.status === 429) throw new Error("Slack: Rate limit exceeded. Retry later.");
    if (err.response?.status === 404) throw new Error(`Slack: API method "${method}" not found.`);
    if (err.code === "ECONNABORTED") throw new Error("Slack: Request timed out.");
    throw new Error(`Slack HTTP error: ${err.response?.status || err.code} — ${err.message}`);
  }
  if (!response.data.ok) {
    const err = response.data.error || "unknown_error";
    if (err === "invalid_auth" || err === "not_authed") throw new Error("Slack: Invalid Bot Token.");
    if (err === "token_revoked") throw new Error("Slack: Bot Token has been revoked. Reconnect in Vault.");
    if (err === "channel_not_found") throw new Error("Slack: Channel not found. Use a channel ID (C...) or ensure the bot is invited.");
    if (err === "not_in_channel") throw new Error("Slack: Bot is not in this channel. Invite it with /invite @yourbot.");
    if (err === "cant_invite_self") throw new Error("Slack: Cannot invite the bot to a channel it's already in.");
    if (err === "already_in_channel") throw new Error("Slack: User is already a member of this channel.");
    if (err === "name_taken") throw new Error("Slack: A channel with that name already exists.");
    if (err === "message_not_found") throw new Error("Slack: Message not found — check the timestamp (ts) value.");
    if (err === "already_reacted") throw new Error("Slack: This reaction has already been added to the message.");
    if (err === "ratelimited") throw new Error("Slack: Rate limit exceeded. Retry later.");
    if (err === "missing_scope") throw new Error(`Slack: Missing OAuth scope for "${method}". Add it in your Slack App settings.`);
    throw new Error(`Slack API error: ${err}`);
  }
  return response.data;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function opPostMessage(config, token) {
  // Legacy webhook mode
  if (config.webhookUrl && !config.credentialId) {
    if (!/^https:\/\/hooks\.slack\.com\//.test(config.webhookUrl))
      throw new Error("Slack: Invalid webhook URL.");
    const text = config.message || config.text;
    if (!text) return { success: false, error: "Slack postMessage: 'text' is required — configure this field.", skipped: true };
    await axios.post(config.webhookUrl, { text }, { timeout: 10000 });
    return { ok: true, ts: null, channel: null };
  }

  const channel = config.channel;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack postMessage: 'channel' is required — configure this field.", skipped: true };
  if (!text) return { success: false, error: "Slack postMessage: 'text' is required — configure this field.", skipped: true };

  const payload = { channel, text, unfurl_links: config.unfurlLinks || false };
  if (config.username) payload.username = config.username;
  if (config.iconEmoji) payload.icon_emoji = config.iconEmoji;

  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, messageId: data.ts };
}

async function opPostRichMessage(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack postRichMessage: 'channel' is required — configure this field.", skipped: true };

  // blocks can be passed directly or assembled from simple fields
  let blocks = config.blocks;
  if (!blocks) {
    // Build a simple header + section from config.title and config.text
    blocks = [];
    if (config.title) {
      blocks.push({ type: "header", text: { type: "plain_text", text: config.title } });
    }
    if (config.text) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: config.text } });
    }
    if (config.fields && Array.isArray(config.fields)) {
      blocks.push({
        type: "section",
        fields: config.fields.map((f) => ({ type: "mrkdwn", text: typeof f === "string" ? f : `*${f.label}*\n${f.value}` })),
      });
    }
    if (config.buttonLabel && config.buttonUrl) {
      blocks.push({
        type: "actions",
        elements: [{
          type: "button",
          text: { type: "plain_text", text: config.buttonLabel },
          url: config.buttonUrl,
          style: config.buttonStyle || "primary",
        }],
      });
    }
  }

  if (!blocks || blocks.length === 0)
    return { success: false, error: "Slack postRichMessage: 'blocks' or at least 'text'/'title' is required — configure this field.", skipped: true };

  const payload = { channel, blocks, text: config.fallbackText || config.text || "New message" };
  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, messageId: data.ts };
}

async function opUploadFile(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack uploadFile: 'channel' is required — configure this field.", skipped: true };

  // Binary attachment upload (from AI Agent forwarded files)
  const attachment = Array.isArray(config.attachments) && config.attachments.length > 0
    ? config.attachments[0]
    : null;

  if (attachment?.dataUrl) {
    const base64Data = attachment.dataUrl.includes(",") ? attachment.dataUrl.split(",")[1] : attachment.dataUrl;
    const binaryBuffer = Buffer.from(base64Data, "base64");
    const filename = attachment.name || config.filename || "file";
    const mimeType = attachment.mimeType || "application/octet-stream";

    // Slack Files API v2: get upload URL → upload binary → complete
    const urlRes = await axios.get(`${API}/files.getUploadURLExternal`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { filename, length: binaryBuffer.length },
      timeout: 15000,
    });
    if (!urlRes.data.ok) throw new Error(`Slack: Failed to get upload URL — ${urlRes.data.error}`);
    const { upload_url: uploadUrl, file_id: fileId } = urlRes.data;

    await axios.post(uploadUrl, binaryBuffer, {
      headers: { "Content-Type": mimeType },
      timeout: 60000,
      maxBodyLength: Infinity,
    });

    const completeRes = await axios.post(`${API}/files.completeUploadExternal`, {
      files: [{ id: fileId, title: config.title || filename }],
      channel_id: channel,
      initial_comment: config.text || undefined,
    }, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    if (!completeRes.data.ok) throw new Error(`Slack: Upload completion failed — ${completeRes.data.error}`);
    return { ok: true, fileId, fileName: filename };
  }

  // Text/code snippet upload (legacy path)
  const content = config.content || config.text;
  if (!content) return { success: false, error: "Slack uploadFile: 'content' or 'attachmentIndices' is required.", skipped: true };
  const payload = {
    channels: channel,
    content,
    filename: config.filename || "output.txt",
    filetype: config.filetype || "text",
    title: config.title || config.filename || "File",
  };
  const data = await slackCall(token, "files.upload", payload);
  return { ok: true, fileId: data.file?.id, fileName: data.file?.name, url: data.file?.permalink };
}

async function opGetUser(config, token) {
  const email = config.email;
  if (!email) return { success: false, error: "Slack getUser: 'email' is required — configure this field.", skipped: true };

  const response = await axios.get(`${API}/users.lookupByEmail`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { email },
    timeout: 10000,
  });
  if (!response.data.ok) {
    if (response.data.error === "users_not_found") throw new Error(`Slack getUser: No user found with email "${email}".`);
    throw new Error(`Slack API error: ${response.data.error}`);
  }
  const u = response.data.user;
  return {
    ok: true,
    userId: u.id,
    name: u.real_name || u.name,
    email: u.profile?.email,
    displayName: u.profile?.display_name,
    isAdmin: u.is_admin,
    isBot: u.is_bot,
  };
}

async function opCreateChannel(config, token) {
  const name = config.channelName || config.name;
  if (!name) return { success: false, error: "Slack createChannel: 'channelName' is required — configure this field.", skipped: true };

  const payload = {
    name: name.replace(/[^a-z0-9-_]/gi, "-").toLowerCase(),
    is_private: config.isPrivate || false,
  };
  const data = await slackCall(token, "conversations.create", payload);
  return {
    ok: true,
    channelId: data.channel?.id,
    channelName: data.channel?.name,
    isPrivate: data.channel?.is_private,
  };
}

async function opInviteToChannel(config, token) {
  const channel = config.channel;
  const users = config.userId || config.users;
  if (!channel) return { success: false, error: "Slack inviteToChannel: 'channel' is required — configure this field.", skipped: true };
  if (!users) return { success: false, error: "Slack inviteToChannel: 'userId' is required — configure this field.", skipped: true };

  const data = await slackCall(token, "conversations.invite", {
    channel,
    users: Array.isArray(users) ? users.join(",") : users,
  });
  return { ok: true, channelId: data.channel?.id, channelName: data.channel?.name };
}

async function opSetTopic(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack setTopic: 'channel' is required — configure this field.", skipped: true };
  if (!config.topic) return { success: false, error: "Slack setTopic: 'topic' is required — configure this field.", skipped: true };

  const data = await slackCall(token, "conversations.setTopic", { channel, topic: config.topic });
  return { ok: true, topic: data.topic };
}

async function opAddReaction(config, token) {
  const channel = config.channel;
  const timestamp = config.timestamp || config.ts;
  const emoji = (config.emoji || "").replace(/:/g, "");
  if (!channel) return { success: false, error: "Slack addReaction: 'channel' is required — configure this field.", skipped: true };
  if (!timestamp) return { success: false, error: "Slack addReaction: 'timestamp' (message ts) is required — configure this field.", skipped: true };
  if (!emoji) return { success: false, error: "Slack addReaction: 'emoji' is required (e.g. 'thumbsup') — configure this field.", skipped: true };

  await slackCall(token, "reactions.add", { channel, timestamp, name: emoji });
  return { ok: true, emoji, channel, timestamp };
}

async function opUpdateMessage(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack updateMessage: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack updateMessage: 'timestamp' (ts) is required.", skipped: true };
  if (!text && !config.blocks) return { success: false, error: "Slack updateMessage: 'text' or 'blocks' is required.", skipped: true };
  const payload = { channel, ts };
  if (text) payload.text = text;
  if (config.blocks) payload.blocks = config.blocks;
  const data = await slackCall(token, "chat.update", payload);
  return { ok: true, ts: data.ts, channel: data.channel };
}

async function opDeleteMessage(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel) return { success: false, error: "Slack deleteMessage: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack deleteMessage: 'timestamp' (ts) is required.", skipped: true };
  const data = await slackCall(token, "chat.delete", { channel, ts });
  return { ok: true, ts: data.ts, channel: data.channel, deleted: true };
}

async function opScheduleMessage(config, token) {
  const channel = config.channel;
  const text = config.message || config.text;
  const postAt = config.postAt;
  if (!channel) return { success: false, error: "Slack scheduleMessage: 'channel' is required.", skipped: true };
  if (!text) return { success: false, error: "Slack scheduleMessage: 'text' is required.", skipped: true };
  if (!postAt) return { success: false, error: "Slack scheduleMessage: 'postAt' (unix timestamp) is required.", skipped: true };
  const data = await slackCall(token, "chat.scheduleMessage", { channel, text, post_at: Number(postAt) });
  return { ok: true, scheduledMessageId: data.scheduled_message_id, channel: data.channel, postAt: data.post_at };
}

async function opPostEphemeral(config, token) {
  const channel = config.channel;
  const user = config.userId || config.user;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack postEphemeral: 'channel' is required.", skipped: true };
  if (!user) return { success: false, error: "Slack postEphemeral: 'userId' is required.", skipped: true };
  if (!text) return { success: false, error: "Slack postEphemeral: 'text' is required.", skipped: true };
  const data = await slackCall(token, "chat.postEphemeral", { channel, user, text });
  return { ok: true, messageTs: data.message_ts };
}

async function opReplyInThread(config, token) {
  const channel = config.channel;
  const threadTs = config.threadTs || config.timestamp || config.ts;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack replyInThread: 'channel' is required.", skipped: true };
  if (!threadTs) return { success: false, error: "Slack replyInThread: 'threadTs' (parent ts) is required.", skipped: true };
  if (!text) return { success: false, error: "Slack replyInThread: 'text' is required.", skipped: true };
  const payload = { channel, text, thread_ts: threadTs };
  if (config.broadcast) payload.reply_broadcast = true;
  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, threadTs };
}

async function opGetPermalink(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel) return { success: false, error: "Slack getPermalink: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack getPermalink: 'timestamp' (ts) is required.", skipped: true };
  const response = await axios.get(`${API}/chat.getPermalink`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel, message_ts: ts },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getPermalink: ${response.data.error}`);
  return { ok: true, permalink: response.data.permalink };
}

async function opRemoveReaction(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  const emoji = (config.emoji || "").replace(/:/g, "");
  if (!channel || !ts || !emoji) return { success: false, error: "Slack removeReaction: 'channel', 'timestamp' and 'emoji' are required.", skipped: true };
  await slackCall(token, "reactions.remove", { channel, timestamp: ts, name: emoji });
  return { ok: true, emoji, channel, timestamp: ts, removed: true };
}

async function opGetReactions(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel || !ts) return { success: false, error: "Slack getReactions: 'channel' and 'timestamp' are required.", skipped: true };
  const response = await axios.get(`${API}/reactions.get`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel, timestamp: ts },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getReactions: ${response.data.error}`);
  const reactions = response.data.message?.reactions || [];
  return { ok: true, reactions: reactions.map((r) => ({ name: r.name, count: r.count, users: r.users })) };
}

async function opArchiveChannel(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack archiveChannel: 'channel' is required.", skipped: true };
  await slackCall(token, "conversations.archive", { channel });
  return { ok: true, channel, archived: true };
}

async function opRenameChannel(config, token) {
  const channel = config.channel;
  const name = config.channelName || config.name;
  if (!channel) return { success: false, error: "Slack renameChannel: 'channel' is required.", skipped: true };
  if (!name) return { success: false, error: "Slack renameChannel: 'channelName' is required.", skipped: true };
  const data = await slackCall(token, "conversations.rename", { channel, name: name.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() });
  return { ok: true, channelId: data.channel?.id, channelName: data.channel?.name };
}

async function opSetPurpose(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack setPurpose: 'channel' is required.", skipped: true };
  if (!config.purpose) return { success: false, error: "Slack setPurpose: 'purpose' is required.", skipped: true };
  const data = await slackCall(token, "conversations.setPurpose", { channel, purpose: config.purpose });
  return { ok: true, purpose: data.purpose };
}

async function opKickFromChannel(config, token) {
  const channel = config.channel;
  const user = config.userId || config.user;
  if (!channel || !user) return { success: false, error: "Slack kickFromChannel: 'channel' and 'userId' are required.", skipped: true };
  await slackCall(token, "conversations.kick", { channel, user });
  return { ok: true, channel, user, kicked: true };
}

async function opJoinChannel(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack joinChannel: 'channel' is required.", skipped: true };
  const data = await slackCall(token, "conversations.join", { channel });
  return { ok: true, channelId: data.channel?.id, channelName: data.channel?.name };
}

async function opLeaveChannel(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack leaveChannel: 'channel' is required.", skipped: true };
  await slackCall(token, "conversations.leave", { channel });
  return { ok: true, channel, left: true };
}

async function opListChannels(config, token) {
  const response = await axios.get(`${API}/conversations.list`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      types: config.channelTypes || "public_channel,private_channel",
      limit: Math.min(Number(config.limit) || 100, 1000),
      exclude_archived: config.excludeArchived !== false,
    },
    timeout: 15000,
  });
  if (!response.data.ok) throw new Error(`Slack listChannels: ${response.data.error}`);
  return {
    ok: true,
    count: (response.data.channels || []).length,
    channels: (response.data.channels || []).map((c) => ({ id: c.id, name: c.name, isPrivate: c.is_private, isArchived: c.is_archived, memberCount: c.num_members })),
  };
}

async function opGetChannelHistory(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack getChannelHistory: 'channel' is required.", skipped: true };
  const response = await axios.get(`${API}/conversations.history`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel, limit: Math.min(Number(config.limit) || 50, 1000) },
    timeout: 15000,
  });
  if (!response.data.ok) throw new Error(`Slack getChannelHistory: ${response.data.error}`);
  return {
    ok: true,
    count: (response.data.messages || []).length,
    messages: (response.data.messages || []).map((m) => ({ ts: m.ts, user: m.user, text: m.text, type: m.type })),
  };
}

async function opGetChannelInfo(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack getChannelInfo: 'channel' is required.", skipped: true };
  const response = await axios.get(`${API}/conversations.info`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getChannelInfo: ${response.data.error}`);
  const c = response.data.channel;
  return { ok: true, id: c?.id, name: c?.name, isPrivate: c?.is_private, topic: c?.topic?.value, purpose: c?.purpose?.value, memberCount: c?.num_members, created: c?.created };
}

async function opGetUserInfo(config, token) {
  const user = config.userId || config.user;
  if (!user) return { success: false, error: "Slack getUserInfo: 'userId' is required.", skipped: true };
  const response = await axios.get(`${API}/users.info`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { user },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getUserInfo: ${response.data.error}`);
  const u = response.data.user;
  return { ok: true, userId: u.id, name: u.real_name || u.name, email: u.profile?.email, displayName: u.profile?.display_name, isAdmin: u.is_admin, isBot: u.is_bot, tz: u.tz };
}

async function opListUsers(config, token) {
  const response = await axios.get(`${API}/users.list`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit: Math.min(Number(config.limit) || 100, 1000) },
    timeout: 15000,
  });
  if (!response.data.ok) throw new Error(`Slack listUsers: ${response.data.error}`);
  const members = (response.data.members || []).filter((m) => !m.deleted);
  return { ok: true, count: members.length, users: members.map((u) => ({ id: u.id, name: u.real_name || u.name, email: u.profile?.email, isBot: u.is_bot, isAdmin: u.is_admin })) };
}

async function opOpenDM(config, token) {
  const user = config.userId || config.user;
  if (!user) return { success: false, error: "Slack openDM: 'userId' is required.", skipped: true };
  const data = await slackCall(token, "conversations.open", { users: user });
  return { ok: true, channelId: data.channel?.id };
}

async function opSendDM(config, token) {
  const user = config.userId || config.user;
  const text = config.message || config.text;
  if (!user) return { success: false, error: "Slack sendDM: 'userId' is required.", skipped: true };
  if (!text) return { success: false, error: "Slack sendDM: 'text' is required.", skipped: true };
  const open = await slackCall(token, "conversations.open", { users: user });
  const channel = open.channel?.id;
  if (!channel) throw new Error("Slack sendDM: could not open a DM channel with this user.");
  const data = await slackCall(token, "chat.postMessage", { channel, text });
  return { ok: true, ts: data.ts, channel };
}

async function opSetStatus(config, token) {
  const profile = {
    status_text: config.statusText || "",
    status_emoji: config.statusEmoji || "",
    status_expiration: config.statusExpiration ? Number(config.statusExpiration) : 0,
  };
  const data = await slackCall(token, "users.profile.set", { profile });
  return { ok: true, statusText: data.profile?.status_text, statusEmoji: data.profile?.status_emoji };
}

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  postMessage: opPostMessage,
  postRichMessage: opPostRichMessage,
  updateMessage: opUpdateMessage,
  deleteMessage: opDeleteMessage,
  scheduleMessage: opScheduleMessage,
  postEphemeral: opPostEphemeral,
  replyInThread: opReplyInThread,
  getPermalink: opGetPermalink,
  uploadFile: opUploadFile,
  addReaction: opAddReaction,
  removeReaction: opRemoveReaction,
  getReactions: opGetReactions,
  createChannel: opCreateChannel,
  archiveChannel: opArchiveChannel,
  renameChannel: opRenameChannel,
  setTopic: opSetTopic,
  setPurpose: opSetPurpose,
  inviteToChannel: opInviteToChannel,
  kickFromChannel: opKickFromChannel,
  joinChannel: opJoinChannel,
  leaveChannel: opLeaveChannel,
  listChannels: opListChannels,
  getChannelHistory: opGetChannelHistory,
  getChannelInfo: opGetChannelInfo,
  getUser: opGetUser,
  getUserInfo: opGetUserInfo,
  listUsers: opListUsers,
  openDM: opOpenDM,
  sendDM: opSendDM,
  setStatus: opSetStatus,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "postMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Slack: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    // Legacy webhook mode bypasses token resolution
    if (operation === "postMessage" && config.webhookUrl && !config.credentialId) {
      return opPostMessage(config, null);
    }

    if (!config.credentialId) {
      return { success: false, error: "Slack: No credential selected — pick a Slack Bot Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Slack: Could not resolve credential — ${e.message}`, skipped: true };
    }

    // Allow forwarding attachments from previous node output (standalone canvas use)
    let resolvedConfig = config;
    if (operation === "uploadFile" && typeof config.attachmentIndex === "number" && !config.attachments) {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) resolvedConfig = { ...config, attachments: [att] };
    }

    try {
      return await handler(resolvedConfig, token);
    } catch (err) {
      if (err.message.startsWith("Slack")) throw err;
      if (err.response?.status === 401) throw new Error("Slack: Invalid or expired Bot Token.");
      if (err.response?.status === 403) throw new Error("Slack: Bot lacks permission for this action. Check OAuth scopes.");
      if (err.response?.status === 429) throw new Error("Slack: Rate limit exceeded. Retry later.");
      if (err.response?.status === 404) throw new Error("Slack: Resource not found (404).");
      if (err.response?.status === 500) throw new Error("Slack: Slack server error (500). Retry later.");
      if (err.code === "ECONNABORTED") throw new Error("Slack: Request timed out.");
      throw new Error(`Slack failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};

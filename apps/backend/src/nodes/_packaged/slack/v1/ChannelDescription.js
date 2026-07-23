/**
 * Slack — channel operations. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { API, slackCall } from "../GenericFunctions.js";

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
    timeout: 120000,
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
    timeout: 120000,
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
    timeout: 120000,
  });
  if (!response.data.ok) throw new Error(`Slack getChannelInfo: ${response.data.error}`);
  const c = response.data.channel;
  return { ok: true, id: c?.id, name: c?.name, isPrivate: c?.is_private, topic: c?.topic?.value, purpose: c?.purpose?.value, memberCount: c?.num_members, created: c?.created };
}

export const channelOperations = {
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
};

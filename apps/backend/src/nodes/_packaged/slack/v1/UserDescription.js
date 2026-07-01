/**
 * Slack — user & DM operations. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { API, slackCall } from "../GenericFunctions.js";

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

export const userOperations = {
  getUser: opGetUser,
  getUserInfo: opGetUserInfo,
  listUsers: opListUsers,
  openDM: opOpenDM,
  sendDM: opSendDM,
  setStatus: opSetStatus,
};

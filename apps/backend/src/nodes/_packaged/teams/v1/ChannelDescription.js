/**
 * TEAMS — channel & team resource. createChannel / listChannels / listTeams
 * preserved verbatim from the monolith; getChannel, updateChannel,
 * deleteChannel, listChannelMembers, addChannelMember and getTeam added for
 * parity. Handlers receive (config, client).
 */
import { mapChannel, mapTeam } from "../GenericFunctions.js";

async function opCreateChannel(config, client) {
  const { teamId, displayName, description, membershipType } = config;
  if (!teamId) return { success: false, error: "Teams createChannel: 'teamId' is required.", skipped: true };
  if (!displayName) return { success: false, error: "Teams createChannel: 'displayName' is required.", skipped: true };
  const body = { displayName, membershipType: membershipType || "standard" };
  if (description) body.description = description;
  const res = await client.post(`/teams/${client.enc(teamId)}/channels`, body);
  return { success: true, id: res.data.id, displayName: res.data.displayName, webUrl: res.data.webUrl };
}

async function opListChannels(config, client) {
  const { teamId } = config;
  if (!teamId) return { success: false, error: "Teams listChannels: 'teamId' is required.", skipped: true };
  const res = await client.get(`/teams/${client.enc(teamId)}/channels`);
  return { success: true, count: res.data.value.length, channels: res.data.value.map(mapChannel) };
}

async function opGetChannel(config, client) {
  const { teamId, channelId } = config;
  if (!teamId) return { success: false, error: "Teams getChannel: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams getChannel: 'channelId' is required.", skipped: true };
  const res = await client.get(`/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}`);
  return { success: true, ...mapChannel(res.data) };
}

async function opUpdateChannel(config, client) {
  const { teamId, channelId, displayName, description } = config;
  if (!teamId) return { success: false, error: "Teams updateChannel: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams updateChannel: 'channelId' is required.", skipped: true };
  const body = {};
  if (displayName) body.displayName = displayName;
  if (description !== undefined) body.description = description;
  if (!Object.keys(body).length) {
    return { success: false, error: "Teams updateChannel: provide 'displayName' or 'description' to update.", skipped: true };
  }
  await client.patch(`/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}`, body);
  return { success: true, id: channelId, updated: true };
}

async function opDeleteChannel(config, client) {
  const { teamId, channelId } = config;
  if (!teamId) return { success: false, error: "Teams deleteChannel: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams deleteChannel: 'channelId' is required.", skipped: true };
  await client.del(`/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}`);
  return { success: true, id: channelId, deleted: true };
}

async function opListChannelMembers(config, client) {
  const { teamId, channelId } = config;
  if (!teamId) return { success: false, error: "Teams listChannelMembers: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams listChannelMembers: 'channelId' is required.", skipped: true };
  const res = await client.get(`/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/members`);
  return {
    success: true,
    count: res.data.value.length,
    members: res.data.value.map((m) => ({ id: m.id, displayName: m.displayName, email: m.email, roles: m.roles })),
  };
}

async function opAddChannelMember(config, client) {
  const { teamId, channelId, userId } = config;
  if (!teamId) return { success: false, error: "Teams addChannelMember: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams addChannelMember: 'channelId' is required.", skipped: true };
  if (!userId) return { success: false, error: "Teams addChannelMember: 'userId' is required.", skipped: true };
  const roles = config.owner ? ["owner"] : [];
  const res = await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/members`,
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      roles,
      "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`,
    },
  );
  return { success: true, id: res.data.id, displayName: res.data.displayName };
}

async function opListTeams(_config, client) {
  const res = await client.get(`/me/joinedTeams`);
  return { success: true, count: res.data.value.length, teams: res.data.value.map(mapTeam) };
}

async function opGetTeam(config, client) {
  const { teamId } = config;
  if (!teamId) return { success: false, error: "Teams getTeam: 'teamId' is required.", skipped: true };
  const res = await client.get(`/teams/${client.enc(teamId)}`);
  return { success: true, ...mapTeam(res.data) };
}

export const channelOperations = {
  createChannel: opCreateChannel,
  listChannels: opListChannels,
  getChannel: opGetChannel,
  updateChannel: opUpdateChannel,
  deleteChannel: opDeleteChannel,
  listChannelMembers: opListChannelMembers,
  addChannelMember: opAddChannelMember,
  listTeams: opListTeams,
  getTeam: opGetTeam,
};

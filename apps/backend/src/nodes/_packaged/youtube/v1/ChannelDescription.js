/**
 * YouTube — Channel & Subscription resources. Channel get/list/update-branding,
 * channel-section listing, and subscription create/list/delete. Handlers
 * receive the raw OAuth access token.
 */
import { get, post, put, del, boundResults } from "../GenericFunctions.js";

async function opGetChannel(config, token) {
  const params = { part: config.part || "snippet,statistics,brandingSettings,contentDetails" };
  if (config.channelId) params.id = config.channelId;
  else if (config.forUsername) params.forUsername = config.forUsername;
  else params.mine = true;
  const data = await get(token, `/channels`, { params, timeout: 10000 });
  return { success: true, ...data.items?.[0] };
}

async function opListMyChannels(config, token) {
  const data = await get(token, `/channels`, {
    params: { part: "snippet,statistics,contentDetails", mine: true, maxResults: boundResults(config.maxResults, 20) },
  });
  return { success: true, items: data.items };
}

async function opUpdateChannelBranding(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube updateChannelBranding: 'channelId' is required.", skipped: true };
  const current = await get(token, `/channels`, { params: { part: "brandingSettings", id: config.channelId } });
  const existing = current.items?.[0];
  if (!existing) return { success: false, error: `YouTube updateChannelBranding: Channel "${config.channelId}" not found.`, skipped: true };
  const branding = existing.brandingSettings || { channel: {} };
  branding.channel = branding.channel || {};
  if (config.description != null) branding.channel.description = config.description;
  if (config.keywords != null) branding.channel.keywords = config.keywords;
  if (config.defaultLanguage != null) branding.channel.defaultLanguage = config.defaultLanguage;
  if (config.country != null) branding.channel.country = config.country;
  const data = await put(token, `/channels`, { id: config.channelId, brandingSettings: branding }, { params: { part: "brandingSettings" } });
  return { success: true, ...data };
}

async function opListChannelSections(config, token) {
  const params = { part: "snippet,contentDetails" };
  if (config.channelId) params.channelId = config.channelId;
  else params.mine = true;
  const data = await get(token, `/channelSections`, { params });
  return { success: true, items: data.items };
}

async function opSubscribe(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube subscribe: 'channelId' is required.", skipped: true };
  const data = await post(token, `/subscriptions`, {
    snippet: { resourceId: { kind: "youtube#channel", channelId: config.channelId } },
  }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opListSubscriptions(config, token) {
  const params = { part: "snippet,contentDetails", maxResults: boundResults(config.maxResults, 20) };
  if (config.channelId) params.channelId = config.channelId;
  else params.mine = true;
  if (config.order) params.order = config.order;
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/subscriptions`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opUnsubscribe(config, token) {
  if (!config.subscriptionId) return { success: false, error: "YouTube unsubscribe: 'subscriptionId' is required.", skipped: true };
  await del(token, `/subscriptions`, { params: { id: config.subscriptionId } });
  return { success: true, deleted: config.subscriptionId };
}

export const channelOperations = {
  getChannel: opGetChannel,
  listMyChannels: opListMyChannels,
  updateChannelBranding: opUpdateChannelBranding,
  listChannelSections: opListChannelSections,
  subscribe: opSubscribe,
  listSubscriptions: opListSubscriptions,
  unsubscribe: opUnsubscribe,
};

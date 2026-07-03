/**
 * Mastodon — Timeline, Search, Notification, List & Tag resources. Home/public/
 * hashtag/list timelines, account & full-text search, notifications, favourites
 * & bookmarks feeds, list CRUD, and hashtag follow/unfollow. Handlers receive
 * { headers, base }.
 */
import { get, getV2, post, del, boundLimit, mapStatus, mapAccount } from "../GenericFunctions.js";

async function opGetTimeline(config, client) {
  const data = await get(client, `/timelines/home`, { params: { limit: boundLimit(config.limit) } });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opGetPublicTimeline(config, client) {
  const params = { limit: boundLimit(config.limit) };
  if (config.local != null) params.local = config.local === true;
  if (config.onlyMedia != null) params.only_media = config.onlyMedia === true;
  const data = await get(client, `/timelines/public`, { params });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opGetHashtagTimeline(config, client) {
  const tag = config.hashtag || config.tag;
  if (!tag) return { success: false, error: "mastodon: 'hashtag' is required.", skipped: true };
  const params = { limit: boundLimit(config.limit) };
  if (config.local != null) params.local = config.local === true;
  const data = await get(client, `/timelines/tag/${encodeURIComponent(tag.replace(/^#/, ""))}`, { params });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opGetListTimeline(config, client) {
  if (!config.listId) return { success: false, error: "mastodon: 'listId' is required.", skipped: true };
  const data = await get(client, `/timelines/list/${config.listId}`, { params: { limit: boundLimit(config.limit) } });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opSearchAccounts(config, client, input) {
  const q = config.q || config.query || input?.query;
  if (!q) return { success: false, error: "mastodon: 'q' query is required.", skipped: true };
  const data = await get(client, `/accounts/search`, { params: { q, limit: boundLimit(config.limit, 10) } });
  return { accounts: (data || []).map(mapAccount), count: data?.length || 0 };
}

async function opSearch(config, client, input) {
  const q = config.q || config.query || input?.query;
  if (!q) return { success: false, error: "mastodon: 'q' query is required.", skipped: true };
  const params = { q, limit: boundLimit(config.limit, 10) };
  if (config.searchType) params.type = config.searchType;
  if (config.resolve != null) params.resolve = config.resolve === true;
  const data = await getV2(client, `/search`, { params });
  return {
    accounts: (data.accounts || []).map(mapAccount),
    statuses: (data.statuses || []).map(mapStatus),
    hashtags: (data.hashtags || []).map((h) => ({ name: h.name, url: h.url })),
  };
}

async function opGetNotifications(config, client) {
  const params = { limit: boundLimit(config.limit) };
  if (config.notificationTypes) {
    const types = Array.isArray(config.notificationTypes) ? config.notificationTypes : String(config.notificationTypes).split(",").map((s) => s.trim()).filter(Boolean);
    if (types.length) params["types[]"] = types;
  }
  const data = await get(client, `/notifications`, { params });
  return { notifications: data || [], count: data?.length || 0 };
}

async function opGetFavourites(config, client) {
  const data = await get(client, `/favourites`, { params: { limit: boundLimit(config.limit) } });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opGetBookmarks(config, client) {
  const data = await get(client, `/bookmarks`, { params: { limit: boundLimit(config.limit) } });
  const posts = (data || []).map(mapStatus);
  return { posts, count: posts.length };
}

async function opGetLists(config, client) {
  const data = await get(client, `/lists`);
  return { lists: data || [], count: data?.length || 0 };
}

async function opCreateList(config, client) {
  if (!config.title) return { success: false, error: "mastodon: 'title' is required.", skipped: true };
  const data = await post(client, `/lists`, { title: config.title, replies_policy: config.repliesPolicy || "list" });
  return { id: data.id, title: data.title };
}

async function opDeleteList(config, client) {
  if (!config.listId) return { success: false, error: "mastodon: 'listId' is required.", skipped: true };
  await del(client, `/lists/${config.listId}`);
  return { deleted: true, id: config.listId };
}

async function opAddToList(config, client) {
  if (!config.listId || !config.accountId) return { success: false, error: "mastodon: 'listId' and 'accountId' are required.", skipped: true };
  const ids = Array.isArray(config.accountId) ? config.accountId : String(config.accountId).split(",").map((s) => s.trim()).filter(Boolean);
  await post(client, `/lists/${config.listId}/accounts`, { account_ids: ids });
  return { success: true, listId: config.listId, added: ids };
}

async function opFollowHashtag(config, client) {
  const tag = config.hashtag || config.tag;
  if (!tag) return { success: false, error: "mastodon: 'hashtag' is required.", skipped: true };
  const data = await post(client, `/tags/${encodeURIComponent(tag.replace(/^#/, ""))}/follow`);
  return { following: data.following, name: data.name };
}

async function opUnfollowHashtag(config, client) {
  const tag = config.hashtag || config.tag;
  if (!tag) return { success: false, error: "mastodon: 'hashtag' is required.", skipped: true };
  const data = await post(client, `/tags/${encodeURIComponent(tag.replace(/^#/, ""))}/unfollow`);
  return { following: data.following, name: data.name };
}

export const timelineOperations = {
  getTimeline: opGetTimeline,
  timeline: opGetTimeline,
  getPublicTimeline: opGetPublicTimeline,
  getHashtagTimeline: opGetHashtagTimeline,
  getListTimeline: opGetListTimeline,
  searchAccounts: opSearchAccounts,
  search: opSearch,
  getNotifications: opGetNotifications,
  getFavourites: opGetFavourites,
  getBookmarks: opGetBookmarks,
  getLists: opGetLists,
  createList: opCreateList,
  deleteList: opDeleteList,
  addToList: opAddToList,
  followHashtag: opFollowHashtag,
  unfollowHashtag: opUnfollowHashtag,
};

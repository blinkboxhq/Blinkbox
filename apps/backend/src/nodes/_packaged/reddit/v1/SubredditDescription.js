/**
 * Reddit — Subreddit & User resources. Subreddit about/rules/moderators, search
 * subreddits, subscribe/unsubscribe, list flairs; user about/submitted/overview
 * and self (getMe) profile. Handlers receive { headers }.
 */
import { get, postForm, boundLimit, mapPost } from "../GenericFunctions.js";

async function opGetSubreddit(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit getSubreddit: 'subreddit' required.", skipped: true };
  const data = await get(client, `/r/${encodeURIComponent(config.subreddit)}/about.json`);
  const d = data.data || {};
  return {
    name: d.display_name,
    title: d.title,
    description: d.public_description,
    subscribers: d.subscribers,
    activeUsers: d.active_user_count,
    over18: d.over18,
    created: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
    url: d.url,
  };
}

async function opGetSubredditRules(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit getSubredditRules: 'subreddit' required.", skipped: true };
  const data = await get(client, `/r/${encodeURIComponent(config.subreddit)}/about/rules.json`);
  return { rules: data.rules || [], siteRules: data.site_rules || [] };
}

async function opGetModerators(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit getModerators: 'subreddit' required.", skipped: true };
  const data = await get(client, `/r/${encodeURIComponent(config.subreddit)}/about/moderators.json`);
  return { moderators: data.data?.children || [] };
}

async function opSearchSubreddits(config, client) {
  if (!config.query) return { success: false, error: "Reddit searchSubreddits: 'query' required.", skipped: true };
  const data = await get(client, `/subreddits/search.json`, { params: { q: config.query, limit: boundLimit(config.limit) } });
  const subs = (data.data?.children || []).map((c) => ({
    name: c.data.display_name,
    title: c.data.title,
    subscribers: c.data.subscribers,
    description: c.data.public_description,
    over18: c.data.over18,
  }));
  return { subreddits: subs, count: subs.length, after: data.data?.after };
}

async function opSubscribe(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit subscribe: 'subreddit' required.", skipped: true };
  await postForm(client, `/api/subscribe`, { action: "sub", sr_name: config.subreddit });
  return { success: true, subscribed: config.subreddit };
}

async function opUnsubscribe(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit unsubscribe: 'subreddit' required.", skipped: true };
  await postForm(client, `/api/subscribe`, { action: "unsub", sr_name: config.subreddit });
  return { success: true, unsubscribed: config.subreddit };
}

async function opGetLinkFlairs(config, client) {
  if (!config.subreddit) return { success: false, error: "Reddit getLinkFlairs: 'subreddit' required.", skipped: true };
  const data = await get(client, `/r/${encodeURIComponent(config.subreddit)}/api/link_flair_v2.json`);
  return { flairs: Array.isArray(data) ? data : [] };
}

async function opGetUser(config, client) {
  if (!config.username) return { success: false, error: "Reddit getUser: 'username' required.", skipped: true };
  const data = await get(client, `/user/${encodeURIComponent(config.username)}/about.json`);
  const d = data.data || {};
  return {
    name: d.name,
    id: d.id,
    linkKarma: d.link_karma,
    commentKarma: d.comment_karma,
    totalKarma: d.total_karma,
    created: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
    verified: d.verified,
    isGold: d.is_gold,
    isMod: d.is_mod,
  };
}

async function opGetUserPosts(config, client) {
  if (!config.username) return { success: false, error: "Reddit getUserPosts: 'username' required.", skipped: true };
  const params = { limit: boundLimit(config.limit), sort: config.sort || "new" };
  if (config.after) params.after = config.after;
  const data = await get(client, `/user/${encodeURIComponent(config.username)}/submitted.json`, { params });
  const posts = (data.data?.children || []).map(mapPost);
  return { posts, count: posts.length, after: data.data?.after };
}

async function opGetMe(config, client) {
  const data = await get(client, `/api/v1/me`);
  return data;
}

export const subredditOperations = {
  getSubreddit: opGetSubreddit,
  getSubredditRules: opGetSubredditRules,
  getModerators: opGetModerators,
  searchSubreddits: opSearchSubreddits,
  subscribe: opSubscribe,
  unsubscribe: opUnsubscribe,
  getLinkFlairs: opGetLinkFlairs,
  getUser: opGetUser,
  getUserPosts: opGetUserPosts,
  getMe: opGetMe,
};

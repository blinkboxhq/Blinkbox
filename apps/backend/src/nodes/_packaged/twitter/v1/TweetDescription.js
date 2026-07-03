/**
 * Twitter / X — Tweet resource. Post, reply, quote, delete, get, search,
 * retweet, and bookmark. Return shapes mirror the original node (raw fields,
 * not `{ success }` wrappers) to keep downstream mappings stable.
 */
import { req, clampResults } from "../GenericFunctions.js";

async function opPostTweet(config, client) {
  if (!config.text) return { success: false, error: "Twitter postTweet: 'text' is required — configure this field.", skipped: true };
  const body = { text: config.text };
  if (config.replyToId) body.reply = { in_reply_to_tweet_id: config.replyToId };
  if (config.quoteTweetId) body.quote_tweet_id = config.quoteTweetId;
  if (config.mediaIds) body.media = { media_ids: String(config.mediaIds).split(",").map((s) => s.trim()).filter(Boolean) };
  const data = await req(client, "POST", `/tweets`, { body });
  return { id: data.data.id, text: data.data.text, url: `https://twitter.com/i/web/status/${data.data.id}` };
}

async function opReplyTweet(config, client) {
  if (!config.text || !config.replyToId) return { success: false, error: "Twitter replyTweet: 'text' and 'replyToId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/tweets`, { body: { text: config.text, reply: { in_reply_to_tweet_id: config.replyToId } } });
  return { id: data.data.id, text: data.data.text };
}

async function opQuoteTweet(config, client) {
  if (!config.text || !config.quoteTweetId) return { success: false, error: "Twitter quoteTweet: 'text' and 'quoteTweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/tweets`, { body: { text: config.text, quote_tweet_id: config.quoteTweetId } });
  return { id: data.data.id, text: data.data.text, url: `https://twitter.com/i/web/status/${data.data.id}` };
}

async function opDeleteTweet(config, client) {
  if (!config.tweetId) return { success: false, error: "Twitter deleteTweet: 'tweetId' is required — configure this field.", skipped: true };
  const data = await req(client, "DELETE", `/tweets/${encodeURIComponent(config.tweetId)}`);
  return { deleted: data.data?.deleted ?? true, tweetId: config.tweetId };
}

async function opGetTweet(config, client) {
  if (!config.tweetId) return { success: false, error: "Twitter getTweet: 'tweetId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/tweets/${encodeURIComponent(config.tweetId)}`, {
    params: { "tweet.fields": "created_at,author_id,public_metrics,conversation_id,lang" },
  });
  const t = data.data;
  return { id: t.id, text: t.text, createdAt: t.created_at, authorId: t.author_id, metrics: t.public_metrics, lang: t.lang };
}

async function opSearchTweets(config, client) {
  if (!config.query) return { success: false, error: "Twitter searchTweets: 'query' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/tweets/search/recent`, {
    params: { query: config.query, max_results: clampResults(config.limit, 10, 100, 10), "tweet.fields": "created_at,author_id,public_metrics" },
  });
  return { tweets: data.data?.map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at, metrics: t.public_metrics })) ?? [], count: data.meta?.result_count ?? 0 };
}

async function opRetweet(config, client) {
  if (!config.userId || !config.tweetId) return { success: false, error: "Twitter retweet: 'userId' and 'tweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/retweets`, { body: { tweet_id: config.tweetId } });
  return { retweeted: data.data?.retweeted ?? true };
}

async function opUnretweet(config, client) {
  if (!config.userId || !config.tweetId) return { success: false, error: "Twitter unretweet: 'userId' and 'tweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "DELETE", `/users/${encodeURIComponent(config.userId)}/retweets/${encodeURIComponent(config.tweetId)}`);
  return { retweeted: data.data?.retweeted ?? false };
}

async function opBookmarkTweet(config, client) {
  if (!config.userId || !config.tweetId) return { success: false, error: "Twitter bookmarkTweet: 'userId' and 'tweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/bookmarks`, { body: { tweet_id: config.tweetId } });
  return { bookmarked: data.data?.bookmarked ?? true };
}

async function opListRetweeters(config, client) {
  if (!config.tweetId) return { success: false, error: "Twitter listRetweeters: 'tweetId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/tweets/${encodeURIComponent(config.tweetId)}/retweeted_by`, {
    params: { max_results: clampResults(config.limit, 5, 100, 20) },
  });
  return { users: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

async function opListLikingUsers(config, client) {
  if (!config.tweetId) return { success: false, error: "Twitter listLikingUsers: 'tweetId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/tweets/${encodeURIComponent(config.tweetId)}/liking_users`, {
    params: { max_results: clampResults(config.limit, 5, 100, 20) },
  });
  return { users: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

export const tweetOperations = {
  postTweet: opPostTweet,
  replyTweet: opReplyTweet,
  quoteTweet: opQuoteTweet,
  deleteTweet: opDeleteTweet,
  getTweet: opGetTweet,
  searchTweets: opSearchTweets,
  retweet: opRetweet,
  unretweet: opUnretweet,
  bookmarkTweet: opBookmarkTweet,
  listRetweeters: opListRetweeters,
  listLikingUsers: opListLikingUsers,
};

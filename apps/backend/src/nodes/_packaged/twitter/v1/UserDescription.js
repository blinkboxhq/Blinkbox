/**
 * Twitter / X — User resource. Profile lookup, timelines, follow/unfollow,
 * block/mute, likes, and follower/following lists. Return shapes mirror the
 * original node.
 */
import { req, clampResults } from "../GenericFunctions.js";

async function opGetUser(config, client) {
  if (!config.username) return { success: false, error: "Twitter getUser: 'username' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/by/username/${encodeURIComponent(config.username)}`, {
    params: { "user.fields": "id,name,username,description,public_metrics,profile_image_url,verified,created_at" },
  });
  const u = data.data;
  return { id: u.id, name: u.name, username: u.username, description: u.description, verified: u.verified, followers: u.public_metrics?.followers_count, following: u.public_metrics?.following_count, tweets: u.public_metrics?.tweet_count };
}

async function opGetUserById(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getUserById: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}`, {
    params: { "user.fields": "id,name,username,description,public_metrics,profile_image_url,verified" },
  });
  const u = data.data;
  return { id: u.id, name: u.name, username: u.username, description: u.description, followers: u.public_metrics?.followers_count };
}

async function opGetMe(config, client) {
  const data = await req(client, "GET", `/users/me`, {
    params: { "user.fields": "id,name,username,description,public_metrics" },
  });
  const u = data.data;
  return { id: u.id, name: u.name, username: u.username, followers: u.public_metrics?.followers_count };
}

async function opGetUserTweets(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getUserTweets: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}/tweets`, {
    params: { max_results: clampResults(config.limit, 5, 100, 10), "tweet.fields": "created_at,public_metrics", exclude: "retweets,replies" },
  });
  return { tweets: data.data?.map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at })) ?? [], count: data.meta?.result_count ?? 0 };
}

async function opGetUserMentions(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getUserMentions: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}/mentions`, {
    params: { max_results: clampResults(config.limit, 5, 100, 10), "tweet.fields": "created_at,author_id" },
  });
  return { tweets: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

async function opGetUserLikedTweets(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getUserLikedTweets: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}/liked_tweets`, {
    params: { max_results: clampResults(config.limit, 5, 100, 10), "tweet.fields": "created_at" },
  });
  return { tweets: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

async function opLikeTweet(config, client) {
  if (!config.userId || !config.tweetId) return { success: false, error: "Twitter likeTweet: 'userId' and 'tweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/likes`, { body: { tweet_id: config.tweetId } });
  return { liked: data.data?.liked ?? true };
}

async function opUnlikeTweet(config, client) {
  if (!config.userId || !config.tweetId) return { success: false, error: "Twitter unlikeTweet: 'userId' and 'tweetId' are required — configure this field.", skipped: true };
  const data = await req(client, "DELETE", `/users/${encodeURIComponent(config.userId)}/likes/${encodeURIComponent(config.tweetId)}`);
  return { liked: data.data?.liked ?? false };
}

async function opFollowUser(config, client) {
  if (!config.userId || !config.targetUserId) return { success: false, error: "Twitter followUser: 'userId' and 'targetUserId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/following`, { body: { target_user_id: config.targetUserId } });
  return { following: data.data?.following ?? true };
}

async function opUnfollowUser(config, client) {
  if (!config.userId || !config.targetUserId) return { success: false, error: "Twitter unfollowUser: 'userId' and 'targetUserId' are required — configure this field.", skipped: true };
  const data = await req(client, "DELETE", `/users/${encodeURIComponent(config.userId)}/following/${encodeURIComponent(config.targetUserId)}`);
  return { following: data.data?.following ?? false };
}

async function opBlockUser(config, client) {
  if (!config.userId || !config.targetUserId) return { success: false, error: "Twitter blockUser: 'userId' and 'targetUserId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/blocking`, { body: { target_user_id: config.targetUserId } });
  return { blocking: data.data?.blocking ?? true };
}

async function opMuteUser(config, client) {
  if (!config.userId || !config.targetUserId) return { success: false, error: "Twitter muteUser: 'userId' and 'targetUserId' are required — configure this field.", skipped: true };
  const data = await req(client, "POST", `/users/${encodeURIComponent(config.userId)}/muting`, { body: { target_user_id: config.targetUserId } });
  return { muting: data.data?.muting ?? true };
}

async function opGetFollowers(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getFollowers: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}/followers`, {
    params: { max_results: clampResults(config.limit, 1, 1000, 100), "user.fields": "username,name,public_metrics" },
  });
  return { users: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

async function opGetFollowing(config, client) {
  if (!config.userId) return { success: false, error: "Twitter getFollowing: 'userId' is required — configure this field.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userId)}/following`, {
    params: { max_results: clampResults(config.limit, 1, 1000, 100), "user.fields": "username,name,public_metrics" },
  });
  return { users: data.data ?? [], count: data.meta?.result_count ?? 0 };
}

export const userOperations = {
  getUser: opGetUser,
  getUserById: opGetUserById,
  getMe: opGetMe,
  getUserTweets: opGetUserTweets,
  getUserMentions: opGetUserMentions,
  getUserLikedTweets: opGetUserLikedTweets,
  likeTweet: opLikeTweet,
  unlikeTweet: opUnlikeTweet,
  followUser: opFollowUser,
  unfollowUser: opUnfollowUser,
  blockUser: opBlockUser,
  muteUser: opMuteUser,
  getFollowers: opGetFollowers,
  getFollowing: opGetFollowing,
};

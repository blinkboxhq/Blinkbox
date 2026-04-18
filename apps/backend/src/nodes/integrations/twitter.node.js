/**
 * TWITTER / X NODE
 * Post and read tweets via the Twitter API v2.
 *
 * Operations:
 *   postTweet       — Post a new tweet
 *   replyTweet      — Reply to a tweet
 *   deleteTweet     — Delete a tweet by ID
 *   searchTweets    — Search recent tweets by query
 *   getUserTweets   — Get recent tweets from a user
 *   getUser         — Get user profile by username
 *   likeTweet       — Like a tweet
 *
 * Auth: Bearer token (read-only) OR OAuth 2.0 user token (read+write) stored in vault
 * For posting: requires OAuth2 user context token (not just Bearer)
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.twitter.com/2";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Twitter");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message?.startsWith("Twitter")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.detail ?? err.response?.data?.errors?.[0]?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Twitter: Auth failed — ${detail}. Check your token and app permissions.`);
  if (status === 429) throw new Error("Twitter: Rate limit exceeded. Try again later.");
  if (status === 400) throw new Error(`Twitter: Bad request — ${detail}`);
  throw new Error(`Twitter: ${status ?? "Error"} — ${detail}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "postTweet" } = config;
    const token = await getToken(config.credentialId, context.workspaceId);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "postTweet": {
          if (!config.text) throw new Error("Twitter postTweet: 'text' is required.");
          const body = { text: config.text };
          if (config.replyToId) body.reply = { in_reply_to_tweet_id: config.replyToId };
          const res = await axios.post(`${BASE}/tweets`, body, { headers, timeout: 15000 });
          return { id: res.data.data.id, text: res.data.data.text, url: `https://twitter.com/i/web/status/${res.data.data.id}` };
        }

        case "replyTweet": {
          if (!config.text || !config.replyToId) throw new Error("Twitter replyTweet: 'text' and 'replyToId' are required.");
          const res = await axios.post(`${BASE}/tweets`, { text: config.text, reply: { in_reply_to_tweet_id: config.replyToId } }, { headers, timeout: 15000 });
          return { id: res.data.data.id, text: res.data.data.text };
        }

        case "deleteTweet": {
          if (!config.tweetId) throw new Error("Twitter deleteTweet: 'tweetId' is required.");
          const res = await axios.delete(`${BASE}/tweets/${config.tweetId}`, { headers, timeout: 15000 });
          return { deleted: res.data.data?.deleted ?? true, tweetId: config.tweetId };
        }

        case "searchTweets": {
          if (!config.query) throw new Error("Twitter searchTweets: 'query' is required.");
          const res = await axios.get(`${BASE}/tweets/search/recent`, {
            headers, timeout: 15000,
            params: { query: config.query, max_results: Math.min(Math.max(10, Number(config.limit ?? 10)), 100), "tweet.fields": "created_at,author_id,public_metrics" },
          });
          return { tweets: res.data.data?.map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at, metrics: t.public_metrics })) ?? [], count: res.data.meta?.result_count ?? 0 };
        }

        case "getUserTweets": {
          if (!config.userId) throw new Error("Twitter getUserTweets: 'userId' is required.");
          const res = await axios.get(`${BASE}/users/${config.userId}/tweets`, {
            headers, timeout: 15000,
            params: { max_results: Math.min(Math.max(5, Number(config.limit ?? 10)), 100), "tweet.fields": "created_at,public_metrics", exclude: "retweets,replies" },
          });
          return { tweets: res.data.data?.map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at })) ?? [], count: res.data.meta?.result_count ?? 0 };
        }

        case "getUser": {
          if (!config.username) throw new Error("Twitter getUser: 'username' is required.");
          const res = await axios.get(`${BASE}/users/by/username/${config.username}`, {
            headers, timeout: 15000,
            params: { "user.fields": "id,name,username,description,public_metrics,profile_image_url" },
          });
          const u = res.data.data;
          return { id: u.id, name: u.name, username: u.username, description: u.description, followers: u.public_metrics?.followers_count, following: u.public_metrics?.following_count, tweets: u.public_metrics?.tweet_count };
        }

        case "likeTweet": {
          if (!config.userId || !config.tweetId) throw new Error("Twitter likeTweet: 'userId' and 'tweetId' are required.");
          const res = await axios.post(`${BASE}/users/${config.userId}/likes`, { tweet_id: config.tweetId }, { headers, timeout: 15000 });
          return { liked: res.data.data?.liked ?? true };
        }

        default:
          throw new Error(`Twitter: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

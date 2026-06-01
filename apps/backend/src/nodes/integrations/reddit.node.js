import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getToken(config, workspaceId) {
  let clientId = config.clientId, secret = config.clientSecret;
  if (config.credentialId) {
    const raw = await getOAuthToken(config.credentialId, workspaceId, "Reddit");
    try { const j = JSON.parse(raw); clientId = j.clientId; secret = j.clientSecret; } catch { clientId = raw; }
  }
  if (!clientId || !secret) return null;
  const { data } = await axios.post("https://www.reddit.com/api/v1/access_token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    { auth: { username: clientId, password: secret }, headers: { "User-Agent": "BlinkBox/1.0" }, timeout: 10000 }
  );
  return data.access_token;
}

export default {
  async run(config, input, context = {}) {
    try {
    const operation = config.operation || "listPosts";
    const token = await getToken(config, context.workspaceId);
    const headers = token ? { Authorization: `Bearer ${token}`, "User-Agent": "BlinkBox/1.0" } : { "User-Agent": "BlinkBox/1.0" };
    const BASE = "https://oauth.reddit.com";
    const ANON_BASE = "https://www.reddit.com";

    switch (operation) {
      case "listPosts": {
        const sub = config.subreddit || input.subreddit || "popular";
        const sort = config.sort || "hot";
        const limit = config.limit || 25;
        const base = token ? BASE : ANON_BASE;
        const { data } = await axios.get(`${base}/r/${sub}/${sort}.json?limit=${limit}`, { headers, timeout: 10000 });
        const posts = data.data.children.map(c => ({ id: c.data.id, title: c.data.title, url: c.data.url, score: c.data.score, comments: c.data.num_comments, author: c.data.author, subreddit: c.data.subreddit, created: new Date(c.data.created_utc * 1000).toISOString() }));
        return { posts, count: posts.length, subreddit: sub };
      }
      case "getPost": {
        const id = config.postId || input.postId;
        if (!id) return { success: false, error: "Reddit getPost: 'postId' required.", skipped: true };
        const base = token ? BASE : ANON_BASE;
        const { data } = await axios.get(`${base}/comments/${id}.json`, { headers, timeout: 10000 });
        const p = data[0].data.children[0].data;
        const comments = data[1].data.children.map(c => ({ author: c.data.author, body: c.data.body, score: c.data.score }));
        return { id: p.id, title: p.title, body: p.selftext, url: p.url, score: p.score, author: p.author, comments };
      }
      case "submitPost": {
        if (!token) return { success: false, error: "Reddit submitPost: OAuth credentials required.", skipped: true };
        const sub = config.subreddit || input.subreddit;
        if (!sub) return { success: false, error: "Reddit submitPost: 'subreddit' required.", skipped: true };
        const { data } = await axios.post(`${BASE}/api/submit`,
          new URLSearchParams({ sr: sub, kind: config.kind || "self", title: config.title || "Post from BlinkBox", text: config.text || "", url: config.url || "" }),
          { headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );
        return { success: !data.json?.errors?.length, id: data.json?.data?.id, url: data.json?.data?.url };
      }
      case "search": {
        const q = config.query || input.query || "";
        if (!q) return { success: false, error: "Reddit search: 'query' required.", skipped: true };
        const base = token ? BASE : ANON_BASE;
        const { data } = await axios.get(`${base}/search.json?q=${encodeURIComponent(q)}&limit=${config.limit || 25}&sort=${config.sort || "relevance"}`, { headers, timeout: 10000 });
        const results = data.data.children.map(c => ({ id: c.data.id, title: c.data.title, url: c.data.url, score: c.data.score, subreddit: c.data.subreddit }));
        return { results, count: results.length, query: q };
      }
      default:
        return { success: false, error: `Reddit: Unknown operation "${operation}".`, skipped: true };
    }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) throw new Error(`[reddit] Unauthorized — check OAuth credentials.`);
      if (status === 429) throw new Error(`[reddit] Rate limited — add a Delay node.`);
      if (status === 404) throw new Error(`[reddit] Not found — check subreddit/post ID.`);
      throw new Error(`[reddit] ${err.message}`);
    }
  },
};

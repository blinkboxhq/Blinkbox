import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

function handleError(err) {
  if (err.message?.startsWith("Reddit")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error(`Reddit: Unauthorized — check OAuth credentials.`);
  if (status === 429) throw new Error(`Reddit: Rate limited — add a Delay node.`);
  if (status === 404) throw new Error(`Reddit: Not found — check subreddit/post ID.`);
  throw new Error(`Reddit: ${status ?? "Network"} error — ${err.message}`);
}

async function getRedditToken(clientId, clientSecret) {
  try {
    const { data } = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      { auth: { username: clientId, password: clientSecret }, headers: { "User-Agent": "BlinkBox/1.0" }, timeout: 10000 }
    );
    return data.access_token;
  } catch (e) {
    throw new Error(`Reddit: Failed to obtain OAuth token — ${e.message}`);
  }
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listPosts";

    if (!config.credentialId) {
      return { success: false, error: "Reddit: No credential selected.", skipped: true };
    }

    let clientId, clientSecret;
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Reddit");
      try {
        const j = JSON.parse(raw);
        clientId = j.clientId;
        clientSecret = j.clientSecret;
      } catch {
        clientId = raw;
      }
    } catch (e) {
      return { success: false, error: `Reddit: Could not resolve credential — ${e.message}`, skipped: true };
    }

    if (!clientId || !clientSecret) {
      return { success: false, error: "Reddit: Credential must contain clientId and clientSecret.", skipped: true };
    }

    let token;
    try {
      token = await getRedditToken(clientId, clientSecret);
    } catch (e) {
      return { success: false, error: e.message, skipped: true };
    }

    const headers = { Authorization: `Bearer ${token}`, "User-Agent": "BlinkBox/1.0" };
    const BASE = "https://oauth.reddit.com";

    try {
      switch (operation) {
        case "listPosts": {
          const sub = config.subreddit || input.subreddit || "popular";
          const sort = config.sort || "hot";
          const limit = config.limit || 25;
          const { data } = await axios.get(`${BASE}/r/${encodeURIComponent(sub)}/${encodeURIComponent(sort)}.json?limit=${encodeURIComponent(limit)}`, { headers, timeout: 10000 });
          const posts = data.data.children.map((c) => ({
            id: c.data.id,
            title: c.data.title,
            url: c.data.url,
            score: c.data.score,
            comments: c.data.num_comments,
            author: c.data.author,
            subreddit: c.data.subreddit,
            created: new Date(c.data.created_utc * 1000).toISOString(),
          }));
          return { posts, count: posts.length, subreddit: sub };
        }

        case "getPost": {
          const id = config.postId || input.postId;
          if (!id) return { success: false, error: "Reddit getPost: 'postId' required.", skipped: true };
          const { data } = await axios.get(`${BASE}/comments/${encodeURIComponent(id)}.json`, { headers, timeout: 10000 });
          const p = data[0].data.children[0].data;
          const comments = data[1].data.children.map((c) => ({
            author: c.data.author,
            body: c.data.body,
            score: c.data.score,
          }));
          return { id: p.id, title: p.title, body: p.selftext, url: p.url, score: p.score, author: p.author, comments };
        }

        case "submitPost": {
          const sub = config.subreddit || input.subreddit;
          if (!sub) return { success: false, error: "Reddit submitPost: 'subreddit' required.", skipped: true };
          if (!config.title) return { success: false, error: "Reddit submitPost: 'title' required.", skipped: true };
          const { data } = await axios.post(
            `${BASE}/api/submit`,
            new URLSearchParams({
              sr: sub,
              kind: config.kind || "self",
              title: config.title,
              text: config.text || "",
              url: config.url || "",
            }),
            { headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
          );
          return { success: !data.json?.errors?.length, id: data.json?.data?.id, url: data.json?.data?.url };
        }

        case "search": {
          const q = config.query || input.query || "";
          if (!q) return { success: false, error: "Reddit search: 'query' required.", skipped: true };
          const { data } = await axios.get(
            `${BASE}/search.json?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(config.limit || 25)}&sort=${encodeURIComponent(config.sort || "relevance")}`,
            { headers, timeout: 10000 }
          );
          const results = data.data.children.map((c) => ({
            id: c.data.id,
            title: c.data.title,
            url: c.data.url,
            score: c.data.score,
            subreddit: c.data.subreddit,
          }));
          return { results, count: results.length, query: q };
        }

        default:
          return { success: false, error: `Reddit: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};

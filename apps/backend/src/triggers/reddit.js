import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.posts) return input;
    const subreddit = config.subreddit || "programming";
    const sort = config.sort || "new";
    const limit = Math.min(config.limit || 10, 100);
    let headers = { "User-Agent": "BlinkBox/1.0" };
    if (config.credentialId) {
      const token = await getOAuthToken(config.credentialId, config.workspaceId, "Reddit").catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const base = headers.Authorization ? "https://oauth.reddit.com" : "https://www.reddit.com";
    const { data } = await axios.get(`${base}/r/${subreddit}/${sort}.json?limit=${limit}`, { headers, timeout: 15000 });
    const posts = (data?.data?.children ?? []).map(c => {
      const p = c?.data ?? {};
      return {
        id: p.id, name: p.name, title: p.title, url: p.url,
        permalink: `https://www.reddit.com${p.permalink}`,
        selftext: p.selftext, isSelf: p.is_self,
        score: p.score, upvoteRatio: p.upvote_ratio,
        numComments: p.num_comments, numCrossposts: p.num_crossposts,
        author: p.author, authorFlair: p.author_flair_text,
        subreddit: p.subreddit, subredditId: p.subreddit_id,
        thumbnail: p.thumbnail !== "self" && p.thumbnail !== "default" ? p.thumbnail : null,
        preview: p.preview?.images?.[0]?.source?.url,
        flair: p.link_flair_text, isVideo: p.is_video, isNsfw: p.over_18, isSpoiler: p.spoiler,
        awards: p.total_awards_received, createdAt: new Date(p.created_utc * 1000).toISOString(),
      };
    });
    return { subreddit, sort, posts, count: posts.length, latestPost: posts[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};

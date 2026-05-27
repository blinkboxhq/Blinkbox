import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.items || input?.videoId) return input;
    const apiKey = config.apiKey || await getOAuthToken(config.credentialId, config.workspaceId, "YouTube").catch(() => null);
    if (!apiKey) throw new Error("[youtube_trigger] API key required");
    const params = { key: apiKey, part: "snippet,statistics,contentDetails", maxResults: Math.min(config.maxResults || 5, 50), order: config.order || "date", type: "video" };
    if (config.channelId) params.channelId = config.channelId;
    if (config.query) params.q = config.query;
    if (config.publishedAfter) params.publishedAfter = config.publishedAfter;
    const { data } = await axios.get("https://www.googleapis.com/youtube/v3/search", { params, timeout: 15000 });
    const items = (data?.items ?? []).map(v => {
      const s = v?.snippet ?? {};
      const st = v?.statistics ?? {};
      return {
        videoId: v?.id?.videoId || v?.id,
        title: s.title, description: s.description, channelId: s.channelId, channelTitle: s.channelTitle,
        thumbnailUrl: s.thumbnails?.high?.url || s.thumbnails?.default?.url,
        tags: s.tags ?? [], categoryId: v?.snippet?.categoryId,
        url: `https://www.youtube.com/watch?v=${v?.id?.videoId || v?.id}`,
        views: st.viewCount, likes: st.likeCount, comments: st.commentCount,
        publishedAt: s.publishedAt,
      };
    });
    return { items, count: items.length, latestVideo: items[0] ?? null, channelId: config.channelId, triggeredAt: new Date().toISOString() };
  },
};

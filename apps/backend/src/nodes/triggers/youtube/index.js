import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.items || input?.videoId) return input;
    const apiKey = config.apiKey || await getOAuthToken(config.credentialId, config.workspaceId, "YouTube").catch(() => null);
    if (!apiKey) throw new Error("[youtube_trigger] API key required");

    const searchParams = {
      key: apiKey,
      part: "snippet,id",
      maxResults: Math.min(config.maxResults || 5, 50),
      order: config.order || "date",
      type: "video",
    };
    if (config.channelId) searchParams.channelId = config.channelId;
    if (config.query) searchParams.q = config.query;
    if (config.publishedAfter) searchParams.publishedAfter = config.publishedAfter;

    const { data: searchData } = await axios.get("https://www.googleapis.com/youtube/v3/search", { params: searchParams, timeout: 15000 });
    const rawItems = searchData?.items ?? [];
    const videoIds = rawItems.map(v => v?.id?.videoId).filter(Boolean).join(",");

    let statsMap = {};
    if (videoIds) {
      const { data: videoData } = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: { key: apiKey, part: "statistics,contentDetails", id: videoIds },
        timeout: 15000,
      });
      for (const v of (videoData?.items ?? [])) {
        statsMap[v.id] = { statistics: v.statistics ?? {}, contentDetails: v.contentDetails ?? {} };
      }
    }

    const items = rawItems.map(v => {
      const s = v?.snippet ?? {};
      const vid = v?.id?.videoId;
      const st = statsMap[vid]?.statistics ?? {};
      return {
        videoId: vid,
        title: s.title,
        description: s.description,
        channelId: s.channelId,
        channelTitle: s.channelTitle,
        thumbnailUrl: s.thumbnails?.high?.url || s.thumbnails?.default?.url,
        tags: s.tags ?? [],
        categoryId: s.categoryId,
        url: `https://www.youtube.com/watch?v=${vid}`,
        views: st.viewCount,
        likes: st.likeCount,
        comments: st.commentCount,
        publishedAt: s.publishedAt,
      };
    });

    return { items, count: items.length, latestVideo: items[0] ?? null, channelId: config.channelId, triggeredAt: new Date().toISOString() };
  },
};

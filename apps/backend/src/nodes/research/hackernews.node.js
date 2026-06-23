import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const type = config.type || "top";
    const limit = parseInt(config.limit || 10);
    const storyTypes = { top: "topstories", new: "newstories", best: "beststories", ask: "askstories", show: "showstories" };
    const endpoint = storyTypes[type] || "topstories";
    const idsRes = await axios.get(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`, { timeout: TIMEOUT });
    const ids = (idsRes.data || []).slice(0, limit);
    const stories = await Promise.all(ids.map((id) =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 8000 }).then((r) => ({
        id: r.data.id, title: r.data.title, url: r.data.url, score: r.data.score,
        by: r.data.by, time: new Date(r.data.time * 1000).toISOString(),
        descendants: r.data.descendants || 0, type: r.data.type,
      })).catch(() => null)
    ));
    return { stories: stories.filter(Boolean), count: stories.length, type };
  },
};

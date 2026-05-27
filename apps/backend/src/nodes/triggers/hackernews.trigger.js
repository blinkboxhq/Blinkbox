import axios from "axios";

const HN = "https://hacker-news.firebaseio.com/v0";

export default {
  async run(config, input) {
    if (input?.stories) return input;
    const type = config.storyType || "top";
    const limit = Math.min(config.limit || 10, 50);
    const listUrl = `${HN}/${type}stories.json`;
    const { data: ids } = await axios.get(listUrl, { timeout: 10000 });
    const storyIds = (ids ?? []).slice(0, limit);
    const stories = await Promise.all(
      storyIds.map(id =>
        axios.get(`${HN}/item/${id}.json`, { timeout: 8000 })
          .then(r => {
            const s = r.data ?? {};
            return {
              id: s.id, title: s.title, url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
              hnUrl: `https://news.ycombinator.com/item?id=${s.id}`,
              type: s.type, score: s.score, author: s.by,
              numComments: s.descendants ?? 0, text: s.text,
              domain: s.url ? new URL(s.url).hostname.replace("www.", "") : "news.ycombinator.com",
              createdAt: s.time ? new Date(s.time * 1000).toISOString() : null,
            };
          })
          .catch(() => null)
      )
    );
    const valid = stories.filter(Boolean);
    return { storyType: type, stories: valid, count: valid.length, topStory: valid[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};

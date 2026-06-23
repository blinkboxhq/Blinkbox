import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const query = config.query || input?.query || input?.text;
    if (!query) return { success: false, error: "arxiv_search: 'query' is required.", skipped: true };
    const maxResults = parseInt(config.maxResults || 10);
    const res = await axios.get("https://export.arxiv.org/api/query", {
      params: { search_query: `all:${query}`, max_results: maxResults, sortBy: "relevance" },
      timeout: TIMEOUT,
    });
    const entries = [...res.data.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1];
      const get = (tag) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim() || "";
      return {
        id: get("id").split("/abs/")[1],
        title: get("title").replace(/\s+/g, " "),
        summary: get("summary").replace(/\s+/g, " ").substring(0, 500),
        published: get("published"),
        authors: [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((a) => a[1].trim()),
        link: get("id"),
      };
    });
    return { results: entries, count: entries.length, query };
  },
};

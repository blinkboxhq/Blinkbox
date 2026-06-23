import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input, context) {
    const query = config.query || input?.query;
    if (!query) return { success: false, error: "news_search: 'query' is required.", skipped: true };

    const apiKey = config.apiKey || process.env.NEWS_API_KEY;
    if (!apiKey) {
      const res = await axios.get("https://gnews.io/api/v4/search", {
        params: { q: query, lang: config.language || "en", max: parseInt(config.maxResults || 10), apikey: process.env.GNEWS_API_KEY || "demo" },
        timeout: TIMEOUT,
      });
      const articles = (res.data.articles || []).map((a) => ({ title: a.title, description: a.description, url: a.url, source: a.source?.name, publishedAt: a.publishedAt, image: a.image }));
      return { articles, count: articles.length, query };
    }

    const res = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: query, language: config.language || "en", pageSize: parseInt(config.maxResults || 10), sortBy: config.sortBy || "relevancy" },
      headers: { "X-Api-Key": apiKey },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles || []).map((a) => ({ title: a.title, description: a.description, url: a.url, source: a.source?.name, author: a.author, publishedAt: a.publishedAt, urlToImage: a.urlToImage }));
    return { articles, count: articles.length, totalResults: res.data.totalResults, query };
  },
};

import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const query = config.query || config.title || input?.query || input?.title;
    if (!query) return { success: false, error: "wikipedia_lookup: 'query' is required.", skipped: true };
    const lang = config.lang || "en";
    const res = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: TIMEOUT });
    const d = res.data;
    return {
      title: d.title, displayTitle: d.displaytitle, description: d.description,
      extract: d.extract, extractHtml: d.extract_html,
      thumbnail: d.thumbnail?.source, pageUrl: d.content_urls?.desktop?.page,
      lastModified: d.timestamp, wikibaseItem: d.wikibase_item,
    };
  },
};

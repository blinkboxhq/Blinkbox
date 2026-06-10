import Parser from "rss-parser";
import { assertSafeUrl } from "../utils/ssrf.js";

function sanitizeXmlName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "BlinkBox/1.0",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
  xml2js: {
    tagNameProcessors: [sanitizeXmlName],
    attrNameProcessors: [sanitizeXmlName],
  },
  customFields: {
    item: ["media_content", "media_thumbnail", "enclosure", "dc_creator", "content_encoded"],
  },
});

export default {
  async run(config, input) {
    if (input?.items) return input;
    const url = config.feedUrl || config.url || input?.feedUrl;
    if (!url) throw new Error("[rss_trigger] feedUrl is required");
    assertSafeUrl(url);

    const limit = Math.min(config.limit || 20, 100);
    const feed = await rssParser.parseURL(url);
    const rawItems = (feed.items ?? []).slice(0, limit);

    const items = rawItems.map((item) => ({
      title:       item.title        ?? "",
      link:        item.link         ?? item.guid ?? "",
      guid:        item.guid         ?? item.link ?? item.title ?? "",
      description: item.contentSnippet ?? item.content ?? item.summary ?? "",
      content:     item.content_encoded ?? item.content ?? "",
      pubDate:     item.isoDate      ?? item.pubDate ?? item.updated ?? null,
      isoDate:     item.isoDate      ?? null,
      author:      item.creator      ?? item.dc_creator ?? item.author ?? "",
      categories:  item.categories   ?? [],
      enclosure:   item.enclosure    ?? item.media_content ?? null,
      thumbnail:   item.media_thumbnail?._?.url ?? item.media_content?._?.url ?? null,
    }));

    return {
      feedTitle:   feed.title       ?? url,
      feedUrl:     url,
      description: feed.description ?? "",
      language:    feed.language    ?? "",
      items,
      count:       items.length,
      latestItem:  items[0] ?? null,
      triggeredAt: new Date().toISOString(),
    };
  },
};

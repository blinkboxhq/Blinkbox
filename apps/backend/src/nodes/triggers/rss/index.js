import axios from "axios";

export default {
  async run(config, input) {
    if (input?.items) return input;
    const url = config.feedUrl || config.url || input?.feedUrl;
    if (!url) throw new Error("[rss_trigger] feedUrl is required");
    const limit = Math.min(config.limit || 20, 100);
    const { data } = await axios.get(url, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", "User-Agent": "BlinkBox/1.0" },
      timeout: 15000,
    });
    const items = [];
    const rssItems = data.match(/<item[^>]*>([\s\S]*?)<\/item>/g) ?? [];
    for (const item of rssItems.slice(0, limit)) {
      const get = (tag) => { const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`)); return m ? m[1].trim() : null; };
      const linkMatch = item.match(/<link[^>]*>([^<]+)<\/link>/) || item.match(/<link[^>]+href=["']([^"']+)["']/);
      items.push({ title: get("title"), link: linkMatch?.[1]?.trim() || get("guid"), guid: get("guid"), description: get("description") || get("content:encoded"), pubDate: get("pubDate") || get("dc:date"), author: get("author") || get("dc:creator"), category: get("category"), enclosure: item.match(/<enclosure[^>]+url=["']([^"']+)["']/)?.[1] });
    }
    if (items.length === 0) {
      for (const item of (data.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) ?? []).slice(0, limit)) {
        const get = (tag) => { const m = item.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`)); return m ? m[1].trim() : null; };
        const linkMatch = item.match(/<link[^>]+href=["']([^"']+)["']/);
        items.push({ title: get("title"), link: linkMatch?.[1], guid: get("id"), description: get("summary") || get("content"), pubDate: get("published") || get("updated"), author: get("name") });
      }
    }
    const titleMatch = data.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    return { feedTitle: titleMatch?.[1]?.trim() ?? url, feedUrl: url, items, count: items.length, latestItem: items[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};

import axios from "axios";

export default {
  async run(config, input) {
    const feedUrl = config.url || input.url || "";
    if (!feedUrl) return { success: false, error: "RSS: 'url' is required.", skipped: true };

    const limit = Math.min(config.limit || 20, 100);

    const { data } = await axios.get(feedUrl, {
      headers: { "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", "User-Agent": "BlinkBox/1.0 RSS Reader" },
      timeout: 15000,
    });

    const items = [];

    // Parse RSS 2.0
    const rssItems = data.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
    for (const item of rssItems.slice(0, limit)) {
      const get = (tag) => { const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`)); return m ? m[1].trim() : null; };
      items.push({ title: get("title"), link: get("link") || get("guid"), description: get("description") || get("content:encoded"), pubDate: get("pubDate") || get("dc:date"), author: get("author") || get("dc:creator"), category: get("category") });
    }

    // Parse Atom if no RSS items found
    if (items.length === 0) {
      const atomItems = data.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) || [];
      for (const item of atomItems.slice(0, limit)) {
        const get = (tag) => { const m = item.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`)); return m ? m[1].trim() : null; };
        const linkMatch = item.match(/<link[^>]+href=["']([^"']+)["']/);
        items.push({ title: get("title"), link: linkMatch ? linkMatch[1] : null, description: get("summary") || get("content"), pubDate: get("published") || get("updated"), author: get("name") });
      }
    }

    const titleMatch = data.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    return { items, count: items.length, feedTitle: titleMatch ? titleMatch[1].trim() : feedUrl, feedUrl };
  },
};

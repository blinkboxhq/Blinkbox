import axios from "axios";
import { assertSafeUrlResolved } from "../utils/ssrf.js";

export default {
  async run(config, input) {
    const feedUrl = config.url || input.url || "";
    if (!feedUrl) return { success: false, error: "RSS: 'url' is required.", skipped: true };

    const limit = Math.min(config.limit || 20, 100);

    await assertSafeUrlResolved(feedUrl);

    // Follow redirects manually so every hop is SSRF-checked before we fetch it —
    // a public feed URL can 30x to an internal host, which axios would otherwise
    // follow blindly.
    let currentUrl = feedUrl;
    let res;
    for (let hop = 0; hop < 5; hop++) {
      res = await axios.get(currentUrl, {
        headers: { "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", "User-Agent": "BlinkBox/1.0 RSS Reader" },
        timeout: 15000,
        maxRedirects: 0,
        validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
      });
      if (res.status < 300) break;
      const location = res.headers?.location;
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      await assertSafeUrlResolved(currentUrl);
      if (hop === 4) throw new Error("RSS: too many redirects.");
    }
    const data = res.data;

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

/**
 * Notion — workspace search across pages and databases.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers } from "../GenericFunctions.js";

async function opSearchPages(config, token) {
  const body = { query: config.query || "" };
  if (config.filter) body.filter = { value: config.filter, property: "object" }; // "page" or "database"
  body.page_size = Math.min(Number(config.pageSize) || 10, 100);

  const response = await axios.post(`${BASE}/search`, body, { headers: headers(token), timeout: 15000 });
  return {
    results: (response.data.results || []).map((r) => ({
      id: r.id,
      type: r.object,
      url: r.url,
      title: Object.values(r.properties || {}).find((p) => p.type === "title")?.title?.map((t) => t.plain_text).join("") || r.title?.[0]?.plain_text || "",
    })),
    hasMore: response.data.has_more,
    nextCursor: response.data.next_cursor,
  };
}

export const searchOperations = {
  searchPages: opSearchPages,
};

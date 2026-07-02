/**
 * Notion — database operations: query, create, get, update.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers, stripId, parseJSON } from "../GenericFunctions.js";

async function opQueryDatabase(config, token) {
  if (!config.databaseId) return { success: false, error: "Notion queryDatabase: 'databaseId' is required — configure this field.", skipped: true };
  const body = {};
  if (config.filter) body.filter = typeof config.filter === "string" ? (() => { try { return JSON.parse(config.filter); } catch { throw new Error("Notion queryDatabase: 'filter' must be valid JSON."); } })() : config.filter;
  if (config.sorts) body.sorts = typeof config.sorts === "string" ? (() => { try { return JSON.parse(config.sorts); } catch { throw new Error("Notion queryDatabase: 'sorts' must be valid JSON."); } })() : config.sorts;
  if (config.pageSize) body.page_size = Math.min(Number(config.pageSize) || 10, 100);
  if (config.startCursor) body.start_cursor = config.startCursor;

  const response = await axios.post(`${BASE}/databases/${encodeURIComponent(stripId(config.databaseId))}/query`, body, {
    headers: headers(token), timeout: 20000,
  });
  return {
    results: response.data.results,
    hasMore: response.data.has_more,
    nextCursor: response.data.next_cursor,
    total: response.data.results?.length || 0,
  };
}

async function opCreateDatabase(config, token) {
  if (!config.parentId) return { success: false, error: "Notion createDatabase: 'parentId' (parent page ID) is required — configure this field.", skipped: true };
  if (!config.title) return { success: false, error: "Notion createDatabase: 'title' is required — configure this field.", skipped: true };

  const properties = typeof config.properties === "string"
    ? (() => { try { return JSON.parse(config.properties); } catch { throw new Error("Notion createDatabase: 'properties' must be valid JSON."); } })()
    : (config.properties || { Name: { title: {} } });

  const body = {
    parent: { type: "page_id", page_id: stripId(config.parentId) },
    title: [{ type: "text", text: { content: config.title } }],
    properties,
  };
  if (config.description) body.description = [{ type: "text", text: { content: config.description } }];
  if (config.isInline !== undefined) body.is_inline = config.isInline;

  const response = await axios.post(`${BASE}/databases`, body, { headers: headers(token), timeout: 15000 });
  return { databaseId: response.data.id, url: response.data.url, title: config.title, created: true };
}

async function opGetDatabase(config, token) {
  if (!config.databaseId) return { success: false, error: "Notion getDatabase: 'databaseId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/databases/${encodeURIComponent(stripId(config.databaseId))}`, { headers: headers(token), timeout: 15000 });
  const d = response.data;
  return { databaseId: d.id, url: d.url, title: (d.title || []).map((t) => t.plain_text).join(""), properties: d.properties };
}

async function opUpdateDatabase(config, token) {
  if (!config.databaseId) return { success: false, error: "Notion updateDatabase: 'databaseId' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = [{ type: "text", text: { content: config.title } }];
  if (config.description) body.description = [{ type: "text", text: { content: config.description } }];
  if (config.properties) body.properties = parseJSON(config.properties, "updateDatabase", "properties");
  const response = await axios.patch(`${BASE}/databases/${encodeURIComponent(stripId(config.databaseId))}`, body, { headers: headers(token), timeout: 15000 });
  return { databaseId: response.data.id, url: response.data.url, updated: true };
}

export const databaseOperations = {
  queryDatabase: opQueryDatabase,
  createDatabase: opCreateDatabase,
  getDatabase: opGetDatabase,
  updateDatabase: opUpdateDatabase,
};

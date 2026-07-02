/**
 * Notion — page operations: create, update, get, archive, restore.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers, stripId } from "../GenericFunctions.js";

async function opCreatePage(config, token) {
  if (!config.parentId) return { success: false, error: "Notion createPage: 'parentId' (database or page ID) is required — configure this field.", skipped: true };
  const parentType = config.parentType === "page" ? "page_id" : "database_id";
  const body = {
    parent: { [parentType]: stripId(config.parentId) },
    properties: typeof config.properties === "string" ? (() => { try { return JSON.parse(config.properties); } catch { throw new Error("Notion createPage: 'properties' must be valid JSON."); } })() : (config.properties || {}),
  };
  if (config.title) {
    body.properties["title"] = { title: [{ text: { content: config.title } }] };
  }
  if (config.content) {
    body.children = [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: config.content } }] } }];
  }
  const response = await axios.post(`${BASE}/pages`, body, { headers: headers(token), timeout: 15000 });
  return { pageId: response.data.id, url: response.data.url, created: true };
}

async function opUpdatePage(config, token) {
  if (!config.pageId) return { success: false, error: "Notion updatePage: 'pageId' is required — configure this field.", skipped: true };
  const properties = typeof config.properties === "string" ? (() => { try { return JSON.parse(config.properties); } catch { throw new Error("Notion updatePage: 'properties' must be valid JSON."); } })() : (config.properties || {});
  const body = { properties };
  if (config.archived !== undefined) body.archived = config.archived;
  const response = await axios.patch(`${BASE}/pages/${encodeURIComponent(stripId(config.pageId))}`, body, { headers: headers(token), timeout: 15000 });
  return { pageId: response.data.id, url: response.data.url, updated: true };
}

async function opGetPage(config, token) {
  if (!config.pageId) return { success: false, error: "Notion getPage: 'pageId' is required — configure this field.", skipped: true };
  const response = await axios.get(`${BASE}/pages/${encodeURIComponent(stripId(config.pageId))}`, { headers: headers(token), timeout: 15000 });
  const page = response.data;
  // Extract plain title if present
  const titleProp = Object.values(page.properties || {}).find((p) => p.type === "title");
  const title = titleProp?.title?.map((t) => t.plain_text).join("") || "";
  return { pageId: page.id, url: page.url, title, properties: page.properties, created: page.created_time, edited: page.last_edited_time };
}

async function opDeletePage(config, token) {
  if (!config.pageId) return { success: false, error: "Notion deletePage: 'pageId' is required — configure this field.", skipped: true };
  const response = await axios.patch(`${BASE}/pages/${encodeURIComponent(stripId(config.pageId))}`, { archived: true }, { headers: headers(token), timeout: 15000 });
  return { pageId: response.data.id, archived: response.data.archived, deleted: true };
}

async function opRestorePage(config, token) {
  if (!config.pageId) return { success: false, error: "Notion restorePage: 'pageId' is required.", skipped: true };
  const response = await axios.patch(`${BASE}/pages/${encodeURIComponent(stripId(config.pageId))}`, { archived: false }, { headers: headers(token), timeout: 15000 });
  return { pageId: response.data.id, archived: response.data.archived, restored: true };
}

export const pageOperations = {
  createPage: opCreatePage,
  updatePage: opUpdatePage,
  getPage: opGetPage,
  deletePage: opDeletePage,
  restorePage: opRestorePage,
};

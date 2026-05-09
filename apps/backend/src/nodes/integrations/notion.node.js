/**
 * NOTION NODE
 *
 * Operations:
 *   createPage     — Create a new page in a database or as a child (default)
 *   updatePage     — Update page properties
 *   queryDatabase  — Query a database with filters/sorts
 *   getPage        — Retrieve a page by ID
 *   appendBlock    — Append blocks to a page
 *   searchPages    — Search pages/databases by title
 *
 * Auth: Notion Internal Integration Token (Bearer)
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Notion");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message.startsWith("Notion")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message;
  if (status === 401) throw new Error("Notion: Invalid integration token.");
  if (status === 403) throw new Error(`Notion: Missing permissions — ${msg || "check your integration has access to the page/database."}`);
  if (status === 404) throw new Error("Notion: Page or database not found. Ensure integration is added to that page.");
  if (status === 400) throw new Error(`Notion: Bad request — ${msg || err.message}`);
  if (status === 429) throw new Error("Notion: Rate limit exceeded. Retry later.");
  throw new Error(`Notion failed: ${status || err.code} — ${err.message}`);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

function stripId(id) {
  // Accept both raw UUID and Notion page URLs
  return String(id).replace(/^.*\//, "").replace(/-/g, "").replace(/\?.*$/, "");
}

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
  const response = await axios.patch(`${BASE}/pages/${stripId(config.pageId)}`, body, { headers: headers(token), timeout: 15000 });
  return { pageId: response.data.id, url: response.data.url, updated: true };
}

async function opQueryDatabase(config, token) {
  if (!config.databaseId) return { success: false, error: "Notion queryDatabase: 'databaseId' is required — configure this field.", skipped: true };
  const body = {};
  if (config.filter) body.filter = typeof config.filter === "string" ? (() => { try { return JSON.parse(config.filter); } catch { throw new Error("Notion queryDatabase: 'filter' must be valid JSON."); } })() : config.filter;
  if (config.sorts) body.sorts = typeof config.sorts === "string" ? (() => { try { return JSON.parse(config.sorts); } catch { throw new Error("Notion queryDatabase: 'sorts' must be valid JSON."); } })() : config.sorts;
  if (config.pageSize) body.page_size = Math.min(Number(config.pageSize) || 10, 100);
  if (config.startCursor) body.start_cursor = config.startCursor;

  const response = await axios.post(`${BASE}/databases/${stripId(config.databaseId)}/query`, body, {
    headers: headers(token), timeout: 20000,
  });
  return {
    results: response.data.results,
    hasMore: response.data.has_more,
    nextCursor: response.data.next_cursor,
    total: response.data.results?.length || 0,
  };
}

async function opGetPage(config, token) {
  if (!config.pageId) return { success: false, error: "Notion getPage: 'pageId' is required — configure this field.", skipped: true };
  const response = await axios.get(`${BASE}/pages/${stripId(config.pageId)}`, { headers: headers(token), timeout: 15000 });
  const page = response.data;
  // Extract plain title if present
  const titleProp = Object.values(page.properties || {}).find((p) => p.type === "title");
  const title = titleProp?.title?.map((t) => t.plain_text).join("") || "";
  return { pageId: page.id, url: page.url, title, properties: page.properties, created: page.created_time, edited: page.last_edited_time };
}

async function opAppendBlock(config, token) {
  if (!config.pageId) return { success: false, error: "Notion appendBlock: 'pageId' is required — configure this field.", skipped: true };
  if (!config.content && !config.blocks) return { success: false, error: "Notion appendBlock: 'content' or 'blocks' is required — configure this field.", skipped: true };

  let children;
  if (config.blocks) {
    children = typeof config.blocks === "string" ? (() => { try { return JSON.parse(config.blocks); } catch { throw new Error("Notion appendBlock: 'blocks' must be valid JSON."); } })() : config.blocks;
  } else {
    // Simple paragraph block from plain text content
    children = config.content.split("\n\n").filter(Boolean).map((para) => ({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ text: { content: para.slice(0, 2000) } }] },
    }));
  }

  const response = await axios.patch(`${BASE}/blocks/${stripId(config.pageId)}/children`, { children }, {
    headers: headers(token), timeout: 15000,
  });
  return { appended: response.data.results?.length || 0, blockIds: (response.data.results || []).map((b) => b.id) };
}

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

const OPERATIONS = {
  createPage: opCreatePage,
  updatePage: opUpdatePage,
  queryDatabase: opQueryDatabase,
  getPage: opGetPage,
  appendBlock: opAppendBlock,
  searchPages: opSearchPages,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createPage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Notion: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);
    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

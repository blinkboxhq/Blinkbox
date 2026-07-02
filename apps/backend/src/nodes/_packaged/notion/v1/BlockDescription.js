/**
 * Notion — block operations: append, list children, get, update, delete.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers, stripId, parseJSON } from "../GenericFunctions.js";

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

  const response = await axios.patch(`${BASE}/blocks/${encodeURIComponent(stripId(config.pageId))}/children`, { children }, {
    headers: headers(token), timeout: 15000,
  });
  return { appended: response.data.results?.length || 0, blockIds: (response.data.results || []).map((b) => b.id) };
}

async function opGetBlockChildren(config, token) {
  if (!config.blockId) return { success: false, error: "Notion getBlockChildren: 'blockId' (page or block ID) is required.", skipped: true };
  const params = { page_size: Math.min(Number(config.pageSize) || 50, 100) };
  if (config.startCursor) params.start_cursor = config.startCursor;
  const response = await axios.get(`${BASE}/blocks/${encodeURIComponent(stripId(config.blockId))}/children`, { headers: headers(token), params, timeout: 15000 });
  return { results: response.data.results, hasMore: response.data.has_more, nextCursor: response.data.next_cursor, total: response.data.results?.length || 0 };
}

async function opGetBlock(config, token) {
  if (!config.blockId) return { success: false, error: "Notion getBlock: 'blockId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/blocks/${encodeURIComponent(stripId(config.blockId))}`, { headers: headers(token), timeout: 15000 });
  return { block: response.data };
}

async function opUpdateBlock(config, token) {
  if (!config.blockId) return { success: false, error: "Notion updateBlock: 'blockId' is required.", skipped: true };
  let body;
  if (config.blockJson) body = parseJSON(config.blockJson, "updateBlock", "blockJson");
  else if (config.content) {
    const blockType = config.blockType || "paragraph";
    body = { [blockType]: { rich_text: [{ text: { content: config.content } }] } };
  } else return { success: false, error: "Notion updateBlock: provide 'content' or 'blockJson'.", skipped: true };
  const response = await axios.patch(`${BASE}/blocks/${encodeURIComponent(stripId(config.blockId))}`, body, { headers: headers(token), timeout: 15000 });
  return { blockId: response.data.id, type: response.data.type, updated: true };
}

async function opDeleteBlock(config, token) {
  if (!config.blockId) return { success: false, error: "Notion deleteBlock: 'blockId' is required.", skipped: true };
  const response = await axios.delete(`${BASE}/blocks/${encodeURIComponent(stripId(config.blockId))}`, { headers: headers(token), timeout: 15000 });
  return { blockId: response.data.id, archived: response.data.archived, deleted: true };
}

export const blockOperations = {
  appendBlock: opAppendBlock,
  getBlockChildren: opGetBlockChildren,
  getBlock: opGetBlock,
  updateBlock: opUpdateBlock,
  deleteBlock: opDeleteBlock,
};

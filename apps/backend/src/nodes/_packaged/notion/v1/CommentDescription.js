/**
 * Notion — comment operations: create, list.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, headers, stripId } from "../GenericFunctions.js";

async function opCreateComment(config, token) {
  if (!config.pageId && !config.discussionId)
    return { success: false, error: "Notion createComment: 'pageId' or 'discussionId' is required.", skipped: true };
  if (!config.content) return { success: false, error: "Notion createComment: 'content' is required.", skipped: true };
  const body = { rich_text: [{ text: { content: config.content } }] };
  if (config.discussionId) body.discussion_id = config.discussionId;
  else body.parent = { page_id: stripId(config.pageId) };
  const response = await axios.post(`${BASE}/comments`, body, { headers: headers(token), timeout: 15000 });
  return { commentId: response.data.id, created: true };
}

async function opGetComments(config, token) {
  if (!config.blockId && !config.pageId)
    return { success: false, error: "Notion getComments: 'blockId' or 'pageId' is required.", skipped: true };
  const params = { block_id: stripId(config.blockId || config.pageId), page_size: Math.min(Number(config.pageSize) || 50, 100) };
  if (config.startCursor) params.start_cursor = config.startCursor;
  const response = await axios.get(`${BASE}/comments`, { headers: headers(token), params, timeout: 15000 });
  return {
    comments: (response.data.results || []).map((c) => ({
      id: c.id, discussionId: c.discussion_id,
      text: (c.rich_text || []).map((t) => t.plain_text).join(""), createdTime: c.created_time,
    })),
    hasMore: response.data.has_more, nextCursor: response.data.next_cursor,
  };
}

export const commentOperations = {
  createComment: opCreateComment,
  getComments: opGetComments,
};

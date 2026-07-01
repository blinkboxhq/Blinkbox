/**
 * Jira — issue comments (add, get, update, delete).
 * Handlers receive `(config, ctx)`.
 */
import { axios, adf, LIMIT } from "../GenericFunctions.js";

async function opAddComment(config, ctx) {
  if (!config.issueKey || !config.comment) return { success: false, error: "Jira addComment: 'issueKey' and 'comment' are required.", skipped: true };
  const res = await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment`, { body: adf(config.comment) }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, created: res.data.created };
}

async function opGetComments(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getComments: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config) } });
  return { comments: res.data.comments?.map((c) => ({ id: c.id, author: c.author?.displayName, body: c.body?.content?.[0]?.content?.[0]?.text, created: c.created })) ?? [], total: res.data.total };
}

async function opUpdateComment(config, ctx) {
  if (!config.issueKey || !config.commentId || !config.comment) return { success: false, error: "Jira updateComment: 'issueKey', 'commentId' and 'comment' are required.", skipped: true };
  const res = await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment/${encodeURIComponent(config.commentId)}`, { body: adf(config.comment) }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, updated: res.data.updated };
}

async function opDeleteComment(config, ctx) {
  if (!config.issueKey || !config.commentId) return { success: false, error: "Jira deleteComment: 'issueKey' and 'commentId' are required.", skipped: true };
  await axios.delete(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment/${encodeURIComponent(config.commentId)}`, { headers: ctx.headers, timeout: 15000 });
  return { deleted: true, commentId: config.commentId };
}

export const commentOperations = {
  addComment: opAddComment,
  getComments: opGetComments,
  updateComment: opUpdateComment,
  deleteComment: opDeleteComment,
};

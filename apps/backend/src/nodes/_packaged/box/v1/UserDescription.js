/**
 * Box — User & Comment resource. Current user, trash operations, and file
 * comments. These are new parity additions over the monolith. Handlers receive
 * (config, client).
 */
import { enc, num, itemPath, apiGet, apiPost, apiDelete } from "../GenericFunctions.js";

async function opGetCurrentUser(_config, client) {
  const data = await apiGet(client, "/users/me");
  return {
    success: true,
    id: data.id,
    name: data.name,
    login: data.login,
    status: data.status,
    spaceUsed: data.space_used,
    spaceAmount: data.space_amount,
    maxUploadSize: data.max_upload_size,
  };
}

async function opListTrash(config, client) {
  const { limit } = config;
  const data = await apiGet(client, "/folders/trash/items", { limit: num(limit, 100), fields: "id,name,type,size,created_at" });
  return {
    success: true,
    count: data.total_count,
    items: (data.entries ?? []).map((f) => ({ id: f.id, name: f.name, type: f.type, size: f.size })),
  };
}

async function opRestoreFromTrash(config, client) {
  const { fileId, itemType } = config;
  if (!fileId) return { success: false, error: "Box restoreFromTrash: 'fileId' is required.", skipped: true };
  const data = await apiPost(client, `/${itemPath(itemType)}/${enc(fileId)}`, {});
  return { success: true, id: data.id, name: data.name, restored: true };
}

async function opAddComment(config, client) {
  const { fileId, message } = config;
  if (!fileId) return { success: false, error: "Box addComment: 'fileId' is required.", skipped: true };
  if (!message) return { success: false, error: "Box addComment: 'message' is required.", skipped: true };
  const data = await apiPost(client, "/comments", { item: { type: "file", id: fileId }, message });
  return { success: true, id: data.id, message: data.message, createdAt: data.created_at };
}

async function opListComments(config, client) {
  const { fileId, limit } = config;
  if (!fileId) return { success: false, error: "Box listComments: 'fileId' is required.", skipped: true };
  const data = await apiGet(client, `/files/${enc(fileId)}/comments`, { limit: num(limit, 100) });
  return {
    success: true,
    count: data.total_count,
    items: (data.entries ?? []).map((c) => ({ id: c.id, message: c.message, createdBy: c.created_by?.name, createdAt: c.created_at })),
  };
}

async function opDeleteComment(config, client) {
  const { commentId } = config;
  if (!commentId) return { success: false, error: "Box deleteComment: 'commentId' is required.", skipped: true };
  await apiDelete(client, `/comments/${enc(commentId)}`);
  return { success: true, deleted: true, id: commentId };
}

export const userOperations = {
  getCurrentUser: opGetCurrentUser,
  listTrash: opListTrash,
  restoreFromTrash: opRestoreFromTrash,
  addComment: opAddComment,
  listComments: opListComments,
  deleteComment: opDeleteComment,
};

/**
 * FIGMA — Comment resource. list/post/reply/resolve preserved verbatim from the
 * monolith (keyed on `mode`); get added for parity. Handlers receive
 * (config, client) where config carries a resolved `fileKey`.
 */

function commentsUrl(client, fileKey) {
  return `${client.base}/files/${fileKey}/comments`;
}

async function opList(config, client) {
  const res = await client.get(commentsUrl(client, config.fileKey));
  const comments = (res.data.comments || []).map((c) => ({ id: c.id, message: c.message, author: c.user?.handle, resolved: !!c.resolved_at, createdAt: c.created_at }));
  return { comments, count: comments.length };
}

async function opGet(config, client) {
  const res = await client.get(commentsUrl(client, config.fileKey));
  const found = (res.data.comments || []).find((c) => String(c.id) === String(config.commentId));
  if (!config.commentId) return { success: false, error: "figma_comment get: 'commentId' required.", skipped: true };
  return found
    ? { id: found.id, message: found.message, author: found.user?.handle, resolved: !!found.resolved_at, createdAt: found.created_at }
    : { found: false, commentId: config.commentId };
}

async function opPost(config, client) {
  const body = { message: config.message };
  if (config.nodeId) body.client_meta = { node_id: config.nodeId, node_offset: { x: parseFloat(config.x || 0), y: parseFloat(config.y || 0) } };
  const res = await client.post(commentsUrl(client, config.fileKey), body);
  return { commentId: res.data.id, message: res.data.message, createdAt: res.data.created_at, fileKey: config.fileKey };
}

async function opReply(config, client) {
  const res = await client.post(commentsUrl(client, config.fileKey), { message: config.message, comment_id: config.commentId });
  return { commentId: res.data.id, parentId: config.commentId, message: res.data.message, createdAt: res.data.created_at };
}

async function opResolve(config, client) {
  await client.del(`${commentsUrl(client, config.fileKey)}/${config.commentId}`);
  return { commentId: config.commentId, resolved: true };
}

export const commentOperations = {
  list: opList,
  get: opGet,
  post: opPost,
  reply: opReply,
  resolve: opResolve,
};

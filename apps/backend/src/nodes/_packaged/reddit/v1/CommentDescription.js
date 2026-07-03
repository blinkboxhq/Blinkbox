/**
 * Reddit — Comment resource. Reply/comment, edit, delete, vote, save/unsave,
 * list a post's comments, and list a user's comment history. Handlers receive
 * { headers }.
 */
import { get, postForm, boundLimit, mapComment } from "../GenericFunctions.js";

async function opReply(config, client) {
  if (!config.parent || !config.text) return { success: false, error: "Reddit reply: 'parent' (t3_/t1_ fullname) and 'text' required.", skipped: true };
  const data = await postForm(client, `/api/comment`, { thing_id: config.parent, text: config.text, api_type: "json" });
  const errs = data.json?.errors || [];
  return { success: !errs.length, comment: data.json?.data?.things?.[0]?.data, errors: errs };
}

async function opEditComment(config, client) {
  if (!config.fullname || !config.text) return { success: false, error: "Reddit editComment: 'fullname' and 'text' required.", skipped: true };
  const data = await postForm(client, `/api/editusertext`, { thing_id: config.fullname, text: config.text, api_type: "json" });
  return { success: !data.json?.errors?.length, comment: data.json?.data?.things?.[0]?.data, errors: data.json?.errors || [] };
}

async function opDeleteComment(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit deleteComment: 'fullname' required.", skipped: true };
  await postForm(client, `/api/del`, { id: config.fullname });
  return { success: true, deleted: config.fullname };
}

async function opVoteComment(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit voteComment: 'fullname' required.", skipped: true };
  const dir = config.direction === "down" ? -1 : config.direction === "clear" ? 0 : 1;
  await postForm(client, `/api/vote`, { id: config.fullname, dir });
  return { success: true, fullname: config.fullname, direction: dir };
}

async function opSaveComment(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit saveComment: 'fullname' required.", skipped: true };
  await postForm(client, `/api/save`, { id: config.fullname, category: config.category });
  return { success: true, saved: config.fullname };
}

async function opUnsaveComment(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit unsaveComment: 'fullname' required.", skipped: true };
  await postForm(client, `/api/unsave`, { id: config.fullname });
  return { success: true, unsaved: config.fullname };
}

async function opListPostComments(config, client) {
  if (!config.postId) return { success: false, error: "Reddit listPostComments: 'postId' required.", skipped: true };
  const params = { limit: boundLimit(config.limit, 50), sort: config.sort || "confidence" };
  const data = await get(client, `/comments/${encodeURIComponent(config.postId)}.json`, { params });
  const comments = (data[1]?.data?.children || []).filter((c) => c.kind === "t1").map(mapComment);
  return { comments, count: comments.length };
}

async function opListUserComments(config, client) {
  if (!config.username) return { success: false, error: "Reddit listUserComments: 'username' required.", skipped: true };
  const params = { limit: boundLimit(config.limit), sort: config.sort || "new" };
  if (config.after) params.after = config.after;
  const data = await get(client, `/user/${encodeURIComponent(config.username)}/comments.json`, { params });
  const comments = (data.data?.children || []).map(mapComment);
  return { comments, count: comments.length, after: data.data?.after };
}

export const commentOperations = {
  reply: opReply,
  editComment: opEditComment,
  deleteComment: opDeleteComment,
  voteComment: opVoteComment,
  saveComment: opSaveComment,
  unsaveComment: opUnsaveComment,
  listPostComments: opListPostComments,
  listUserComments: opListUserComments,
};

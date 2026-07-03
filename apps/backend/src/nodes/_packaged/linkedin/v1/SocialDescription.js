/**
 * LinkedIn — Social Actions resource. Comments (create / list / delete) and
 * reactions (like / unlike) on a share or UGC post, plus the aggregate
 * comment & like summary for an entity. Uses the /rest socialActions API.
 * Handlers receive the raw bearer token: (config, token).
 */
import axios from "axios";
import { REST_BASE, restHeaders, resolveAuthorUrn, boundCount } from "../GenericFunctions.js";

function requireEntity(config) {
  return config.postId || config.postUrn || config.entityUrn;
}

async function opCreateComment(config, token) {
  const entity = requireEntity(config);
  if (!entity) return { success: false, error: "LinkedIn createComment: 'postId' (entity URN) is required.", skipped: true };
  const text = config.text || config.comment || config.message;
  if (!text) return { success: false, error: "LinkedIn createComment: 'text' is required.", skipped: true };
  const actor = await resolveAuthorUrn(config, token);
  if (!actor) return { success: false, error: "LinkedIn createComment: 'orgId' is required when acting as organization.", skipped: true };

  const { data, headers: respHeaders } = await axios.post(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}/comments`,
    { actor, message: { text } },
    { headers: restHeaders(token), timeout: 15000 },
  );
  return { commentId: respHeaders["x-restli-id"] || data?.$URN || data?.id, entity, actor, text };
}

async function opListComments(config, token) {
  const entity = requireEntity(config);
  if (!entity) return { success: false, error: "LinkedIn listComments: 'postId' (entity URN) is required.", skipped: true };
  const count = boundCount(config.limit, 25, 100);
  const { data } = await axios.get(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}/comments?count=${count}`,
    { headers: restHeaders(token), timeout: 15000 },
  );
  const comments = (data.elements || []).map((c) => ({
    id: c.$URN || c.id,
    actor: c.actor,
    text: c.message?.text || "",
    createdAt: c.created?.time || null,
    likesCount: c.likesSummary?.totalLikes ?? 0,
  }));
  return { comments, count: comments.length };
}

async function opDeleteComment(config, token) {
  const entity = requireEntity(config);
  const commentId = config.commentId;
  if (!entity || !commentId) return { success: false, error: "LinkedIn deleteComment: 'postId' and 'commentId' are required.", skipped: true };
  const actor = await resolveAuthorUrn(config, token);
  if (!actor) return { success: false, error: "LinkedIn deleteComment: 'orgId' is required when acting as organization.", skipped: true };
  await axios.delete(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}/comments/${encodeURIComponent(commentId)}?actor=${encodeURIComponent(actor)}`,
    { headers: restHeaders(token), timeout: 15000 },
  );
  return { deleted: true, entity, commentId };
}

async function opLikePost(config, token) {
  const entity = requireEntity(config);
  if (!entity) return { success: false, error: "LinkedIn likePost: 'postId' (entity URN) is required.", skipped: true };
  const actor = await resolveAuthorUrn(config, token);
  if (!actor) return { success: false, error: "LinkedIn likePost: 'orgId' is required when acting as organization.", skipped: true };
  await axios.post(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}/likes`,
    { actor, root: entity },
    { headers: restHeaders(token), timeout: 15000 },
  );
  return { liked: true, entity, actor };
}

async function opUnlikePost(config, token) {
  const entity = requireEntity(config);
  if (!entity) return { success: false, error: "LinkedIn unlikePost: 'postId' (entity URN) is required.", skipped: true };
  const actor = await resolveAuthorUrn(config, token);
  if (!actor) return { success: false, error: "LinkedIn unlikePost: 'orgId' is required when acting as organization.", skipped: true };
  await axios.delete(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}/likes/${encodeURIComponent(actor)}`,
    { headers: restHeaders(token), timeout: 15000 },
  );
  return { unliked: true, entity, actor };
}

async function opGetSocialSummary(config, token) {
  const entity = requireEntity(config);
  if (!entity) return { success: false, error: "LinkedIn getSocialSummary: 'postId' (entity URN) is required.", skipped: true };
  const { data } = await axios.get(
    `${REST_BASE}/socialActions/${encodeURIComponent(entity)}`,
    { headers: restHeaders(token), timeout: 15000 },
  );
  return {
    entity,
    commentsCount: data.commentsSummary?.aggregatedTotalComments ?? data.commentsSummary?.count ?? 0,
    likesCount: data.likesSummary?.totalLikes ?? data.likesSummary?.count ?? 0,
  };
}

export const socialOperations = {
  createComment: opCreateComment,
  listComments: opListComments,
  deleteComment: opDeleteComment,
  likePost: opLikePost,
  unlikePost: opUnlikePost,
  getSocialSummary: opGetSocialSummary,
};

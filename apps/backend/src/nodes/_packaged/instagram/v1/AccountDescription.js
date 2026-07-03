/**
 * Instagram — Account & Comment resources. Profile info, account insights,
 * hashtag search, and full comment management (list, get, reply, hide, delete).
 */
import { get, post, del } from "../GenericFunctions.js";

/* ---- Account ---- */
async function opGetUserInfo(config, token) {
  return get(token, `/me`, {
    params: { fields: "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website" },
  });
}

async function opGetAccountInsights(config, token) {
  const metrics = config.metrics || "impressions,reach,profile_views";
  const period = config.period || "day";
  const data = await get(token, `/me/insights`, { params: { metric: metrics, period } });
  return { insights: data.data ?? [] };
}

async function opGetHashtagId(config, token) {
  if (!config.userId) return { success: false, error: "Instagram getHashtagId: 'userId' is required.", skipped: true };
  if (!config.hashtag) return { success: false, error: "Instagram getHashtagId: 'hashtag' is required.", skipped: true };
  const data = await get(token, `/ig_hashtag_search`, { params: { user_id: config.userId, q: config.hashtag } });
  return { hashtags: data.data ?? [] };
}

async function opGetRecentSearchMedia(config, token) {
  if (!config.hashtagId) return { success: false, error: "Instagram getRecentSearchMedia: 'hashtagId' is required.", skipped: true };
  if (!config.userId) return { success: false, error: "Instagram getRecentSearchMedia: 'userId' is required.", skipped: true };
  const data = await get(token, `/${encodeURIComponent(config.hashtagId)}/recent_media`, {
    params: { user_id: config.userId, fields: "id,caption,media_type,permalink,like_count,comments_count", limit: config.limit || 20 },
  });
  return { media: data.data ?? [] };
}

/* ---- Comment ---- */
async function opGetComments(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getComments: 'mediaId' is required.", skipped: true };
  const data = await get(token, `/${encodeURIComponent(config.mediaId)}/comments`, {
    params: { fields: "id,text,timestamp,username,like_count", limit: config.limit || 20 },
  });
  return { comments: data.data, total: data.data?.length };
}

async function opGetComment(config, token) {
  if (!config.commentId) return { success: false, error: "Instagram getComment: 'commentId' is required.", skipped: true };
  return get(token, `/${encodeURIComponent(config.commentId)}`, { params: { fields: "id,text,timestamp,username,like_count,replies" } });
}

async function opReplyComment(config, token) {
  if (!config.commentId || !config.message) return { success: false, error: "Instagram replyComment: 'commentId' and 'message' are required.", skipped: true };
  const data = await post(token, `/${encodeURIComponent(config.commentId)}/replies`, { params: { message: config.message } });
  return { id: data.id, success: true };
}

async function opCreateComment(config, token) {
  if (!config.mediaId || !config.message) return { success: false, error: "Instagram createComment: 'mediaId' and 'message' are required.", skipped: true };
  const data = await post(token, `/${encodeURIComponent(config.mediaId)}/comments`, { params: { message: config.message } });
  return { id: data.id, success: true };
}

async function opHideComment(config, token) {
  if (!config.commentId) return { success: false, error: "Instagram hideComment: 'commentId' is required.", skipped: true };
  const hide = config.hide != null ? config.hide : true;
  const data = await post(token, `/${encodeURIComponent(config.commentId)}`, { params: { hide } });
  return { success: data.success ?? true, commentId: config.commentId, hidden: hide };
}

async function opDeleteComment(config, token) {
  if (!config.commentId) return { success: false, error: "Instagram deleteComment: 'commentId' is required.", skipped: true };
  const data = await del(token, `/${encodeURIComponent(config.commentId)}`);
  return { success: data.success ?? true, deleted: true, commentId: config.commentId };
}

export const accountOperations = {
  getUserInfo: opGetUserInfo,
  getAccountInsights: opGetAccountInsights,
  getHashtagId: opGetHashtagId,
  getRecentSearchMedia: opGetRecentSearchMedia,
  getComments: opGetComments,
  getComment: opGetComment,
  replyComment: opReplyComment,
  createComment: opCreateComment,
  hideComment: opHideComment,
  deleteComment: opDeleteComment,
};

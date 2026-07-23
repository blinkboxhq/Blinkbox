/**
 * TikTok — User & Video display resource. Profile info, own-video list, video
 * query/search, and comment listing/replies.
 */
import { post } from "../GenericFunctions.js";

const VIDEO_FIELDS = ["id", "title", "video_description", "create_time", "like_count", "comment_count", "share_count", "view_count", "embed_link"];
const USER_FIELDS = ["open_id", "union_id", "avatar_url", "display_name", "bio_description", "follower_count", "following_count", "likes_count", "video_count"];

async function opGetUserInfo(config, token) {
  const data = await post(token, `/user/info/`, { fields: USER_FIELDS }, { timeout: 120000 });
  return data.data?.user || data;
}

async function opListVideos(config, token) {
  const body = { max_count: Number(config.limit) || 20, fields: VIDEO_FIELDS };
  if (config.cursor) body.cursor = Number(config.cursor);
  const data = await post(token, `/video/list/`, body);
  return { videos: data.data?.videos || [], cursor: data.data?.cursor, hasMore: data.data?.has_more };
}

async function opQueryVideos(config, token) {
  if (!config.videoIds) return { success: false, error: "TikTok queryVideos: 'videoIds' (comma-separated) is required.", skipped: true };
  const ids = String(config.videoIds).split(",").map((s) => s.trim()).filter(Boolean);
  const data = await post(token, `/video/query/`, { filters: { video_ids: ids }, fields: VIDEO_FIELDS });
  return { videos: data.data?.videos || [] };
}

async function opSearchVideos(config, token) {
  if (!config.query) return { success: false, error: "TikTok searchVideos: 'query' is required.", skipped: true };
  const data = await post(token, `/video/search/`, { query: config.query, max_count: Number(config.limit) || 20, fields: VIDEO_FIELDS });
  return { videos: data.data?.videos || [], cursor: data.data?.cursor };
}

async function opListComments(config, token) {
  if (!config.videoId) return { success: false, error: "TikTok listComments: 'videoId' is required.", skipped: true };
  const body = { video_id: config.videoId, max_count: Number(config.limit) || 20 };
  if (config.cursor) body.cursor = Number(config.cursor);
  const data = await post(token, `/video/comment/list/`, body);
  return { comments: data.data?.comments || [], cursor: data.data?.cursor };
}

async function opListReplies(config, token) {
  if (!config.videoId || !config.commentId) return { success: false, error: "TikTok listReplies: 'videoId' and 'commentId' are required.", skipped: true };
  const data = await post(token, `/video/comment/reply/list/`, { video_id: config.videoId, comment_id: config.commentId, max_count: Number(config.limit) || 20 });
  return { replies: data.data?.comments || [], cursor: data.data?.cursor };
}

async function opCreateComment(config, token) {
  if (!config.videoId || !config.text) return { success: false, error: "TikTok createComment: 'videoId' and 'text' are required.", skipped: true };
  const data = await post(token, `/video/comment/create/`, { video_id: config.videoId, text: config.text });
  return { comment: data.data?.comment || data.data, success: true };
}

async function opReplyComment(config, token) {
  if (!config.videoId || !config.commentId || !config.text) return { success: false, error: "TikTok replyComment: 'videoId', 'commentId' and 'text' are required.", skipped: true };
  const data = await post(token, `/video/comment/reply/create/`, { video_id: config.videoId, comment_id: config.commentId, text: config.text });
  return { comment: data.data?.comment || data.data, success: true };
}

export const userOperations = {
  getUserInfo: opGetUserInfo,
  listVideos: opListVideos,
  queryVideos: opQueryVideos,
  searchVideos: opSearchVideos,
  listComments: opListComments,
  listReplies: opListReplies,
  createComment: opCreateComment,
  replyComment: opReplyComment,
};

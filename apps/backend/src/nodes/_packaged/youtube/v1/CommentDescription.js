/**
 * YouTube — Comment & CommentThread resources. List threads for a video/channel,
 * post a top-level comment, reply to a thread, get/update/delete a comment,
 * and set moderation status. Handlers receive the raw OAuth access token.
 */
import { get, post, put, del, boundResults } from "../GenericFunctions.js";

async function opListComments(config, token) {
  if (!config.videoId && !config.channelId) {
    return { success: false, error: "YouTube listComments: 'videoId' or 'channelId' is required.", skipped: true };
  }
  const params = {
    part: "snippet,replies",
    maxResults: boundResults(config.maxResults, 20),
    order: config.order || "relevance",
    textFormat: config.textFormat || "plainText",
  };
  if (config.videoId) params.videoId = config.videoId;
  if (config.channelId) params.allThreadsRelatedToChannelId = config.channelId;
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/commentThreads`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opGetComment(config, token) {
  if (!config.commentId) return { success: false, error: "YouTube getComment: 'commentId' is required.", skipped: true };
  const data = await get(token, `/comments`, { params: { part: "snippet", id: config.commentId, textFormat: config.textFormat || "plainText" } });
  return { success: true, ...data.items?.[0] };
}

async function opListReplies(config, token) {
  if (!config.parentId) return { success: false, error: "YouTube listReplies: 'parentId' (comment id) is required.", skipped: true };
  const params = { part: "snippet", parentId: config.parentId, maxResults: boundResults(config.maxResults, 20), textFormat: config.textFormat || "plainText" };
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/comments`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opCreateComment(config, token) {
  if (!config.videoId || !config.text) return { success: false, error: "YouTube createComment: 'videoId' and 'text' are required.", skipped: true };
  const snippet = {
    videoId: config.videoId,
    topLevelComment: { snippet: { textOriginal: config.text } },
  };
  if (config.channelId) snippet.channelId = config.channelId;
  const data = await post(token, `/commentThreads`, { snippet }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opReplyComment(config, token) {
  if (!config.parentId || !config.text) return { success: false, error: "YouTube replyComment: 'parentId' and 'text' are required.", skipped: true };
  const data = await post(token, `/comments`, {
    snippet: { parentId: config.parentId, textOriginal: config.text },
  }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opUpdateComment(config, token) {
  if (!config.commentId || !config.text) return { success: false, error: "YouTube updateComment: 'commentId' and 'text' are required.", skipped: true };
  const data = await put(token, `/comments`, {
    id: config.commentId,
    snippet: { textOriginal: config.text },
  }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opDeleteComment(config, token) {
  if (!config.commentId) return { success: false, error: "YouTube deleteComment: 'commentId' is required.", skipped: true };
  await del(token, `/comments`, { params: { id: config.commentId } });
  return { success: true, deleted: config.commentId };
}

async function opSetModerationStatus(config, token) {
  if (!config.commentId || !config.moderationStatus) {
    return { success: false, error: "YouTube setModerationStatus: 'commentId' and 'moderationStatus' are required.", skipped: true };
  }
  const params = { id: config.commentId, moderationStatus: config.moderationStatus };
  if (config.banAuthor != null) params.banAuthor = config.banAuthor === true;
  await post(token, `/comments/setModerationStatus`, {}, { params });
  return { success: true, commentId: config.commentId, moderationStatus: config.moderationStatus };
}

async function opMarkAsSpam(config, token) {
  if (!config.commentId) return { success: false, error: "YouTube markAsSpam: 'commentId' is required.", skipped: true };
  await post(token, `/comments/markAsSpam`, {}, { params: { id: config.commentId } });
  return { success: true, markedAsSpam: config.commentId };
}

export const commentOperations = {
  listComments: opListComments,
  getComment: opGetComment,
  listReplies: opListReplies,
  createComment: opCreateComment,
  replyComment: opReplyComment,
  updateComment: opUpdateComment,
  deleteComment: opDeleteComment,
  setModerationStatus: opSetModerationStatus,
  markAsSpam: opMarkAsSpam,
};

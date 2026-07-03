/**
 * Instagram — Media resource. List/get media, publish images, videos, reels,
 * stories, and carousels (two-step container → publish), plus media insights
 * and carousel children.
 */
import { get, post } from "../GenericFunctions.js";

async function opGetUserMedia(config, token) {
  const data = await get(token, `/me/media`, {
    params: {
      fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink",
      limit: config.limit || 20,
    },
    timeout: 15000,
  });
  return { media: data.data, cursor: data.paging?.cursors };
}

async function opGetMedia(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getMedia: 'mediaId' is required.", skipped: true };
  const data = await get(token, `/${encodeURIComponent(config.mediaId)}`, {
    params: { fields: "id,caption,media_type,media_url,timestamp,like_count,comments_count,permalink" },
  });
  return data;
}

async function opGetMediaChildren(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getMediaChildren: 'mediaId' is required.", skipped: true };
  const data = await get(token, `/${encodeURIComponent(config.mediaId)}/children`, {
    params: { fields: "id,media_type,media_url,thumbnail_url" },
  });
  return { children: data.data ?? [] };
}

async function opGetMediaInsights(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getMediaInsights: 'mediaId' is required.", skipped: true };
  const metrics = config.metrics || "impressions,reach,engagement,saved";
  const data = await get(token, `/${encodeURIComponent(config.mediaId)}/insights`, { params: { metric: metrics } });
  return { insights: data.data ?? [] };
}

/** Two-step publish: create a media container, then publish it. */
async function publishContainer(token, userId, containerParams) {
  const container = await post(token, `/${encodeURIComponent(userId)}/media`, { params: containerParams });
  if (!container.id) throw new Error("Instagram: Failed to create media container — no ID returned.");
  const published = await post(token, `/${encodeURIComponent(userId)}/media_publish`, { params: { creation_id: container.id } });
  return { id: published.id, containerId: container.id, success: true };
}

async function opCreatePost(config, token) {
  if (!config.imageUrl) return { success: false, error: "Instagram createPost: 'imageUrl' is required.", skipped: true };
  if (!config.userId) return { success: false, error: "Instagram createPost: 'userId' (Instagram user ID) is required.", skipped: true };
  return publishContainer(token, config.userId, { image_url: config.imageUrl, caption: config.caption || "" });
}

async function opCreateVideoPost(config, token) {
  if (!config.videoUrl) return { success: false, error: "Instagram createVideoPost: 'videoUrl' is required.", skipped: true };
  if (!config.userId) return { success: false, error: "Instagram createVideoPost: 'userId' is required.", skipped: true };
  const params = { media_type: "VIDEO", video_url: config.videoUrl, caption: config.caption || "" };
  if (config.thumbOffset != null) params.thumb_offset = config.thumbOffset;
  return publishContainer(token, config.userId, params);
}

async function opCreateReel(config, token) {
  if (!config.videoUrl) return { success: false, error: "Instagram createReel: 'videoUrl' is required.", skipped: true };
  if (!config.userId) return { success: false, error: "Instagram createReel: 'userId' is required.", skipped: true };
  const params = { media_type: "REELS", video_url: config.videoUrl, caption: config.caption || "" };
  if (config.coverUrl) params.cover_url = config.coverUrl;
  if (config.shareToFeed != null) params.share_to_feed = config.shareToFeed;
  return publishContainer(token, config.userId, params);
}

async function opCreateStory(config, token) {
  if (!config.userId) return { success: false, error: "Instagram createStory: 'userId' is required.", skipped: true };
  if (!config.imageUrl && !config.videoUrl) return { success: false, error: "Instagram createStory: 'imageUrl' or 'videoUrl' is required.", skipped: true };
  const params = { media_type: "STORIES" };
  if (config.imageUrl) params.image_url = config.imageUrl;
  if (config.videoUrl) params.video_url = config.videoUrl;
  return publishContainer(token, config.userId, params);
}

async function opCreateCarousel(config, token) {
  if (!config.userId) return { success: false, error: "Instagram createCarousel: 'userId' is required.", skipped: true };
  if (!config.childContainerIds) return { success: false, error: "Instagram createCarousel: 'childContainerIds' (comma-separated container IDs) is required.", skipped: true };
  const children = String(config.childContainerIds).split(",").map((s) => s.trim()).filter(Boolean);
  return publishContainer(token, config.userId, { media_type: "CAROUSEL", children: children.join(","), caption: config.caption || "" });
}

async function opCreateCarouselItem(config, token) {
  if (!config.userId) return { success: false, error: "Instagram createCarouselItem: 'userId' is required.", skipped: true };
  if (!config.imageUrl && !config.videoUrl) return { success: false, error: "Instagram createCarouselItem: 'imageUrl' or 'videoUrl' is required.", skipped: true };
  const params = { is_carousel_item: true };
  if (config.imageUrl) params.image_url = config.imageUrl;
  if (config.videoUrl) { params.media_type = "VIDEO"; params.video_url = config.videoUrl; }
  const container = await post(token, `/${encodeURIComponent(config.userId)}/media`, { params });
  return { containerId: container.id, success: true };
}

async function opGetContainerStatus(config, token) {
  if (!config.containerId) return { success: false, error: "Instagram getContainerStatus: 'containerId' is required.", skipped: true };
  const data = await get(token, `/${encodeURIComponent(config.containerId)}`, { params: { fields: "status_code,status" } });
  return { statusCode: data.status_code, status: data.status };
}

export const mediaOperations = {
  getUserMedia: opGetUserMedia,
  getMedia: opGetMedia,
  getMediaChildren: opGetMediaChildren,
  getMediaInsights: opGetMediaInsights,
  createPost: opCreatePost,
  createVideoPost: opCreateVideoPost,
  createReel: opCreateReel,
  createStory: opCreateStory,
  createCarousel: opCreateCarousel,
  createCarouselItem: opCreateCarouselItem,
  getContainerStatus: opGetContainerStatus,
};

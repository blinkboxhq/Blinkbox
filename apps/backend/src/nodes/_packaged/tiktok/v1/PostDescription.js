/**
 * TikTok — Content Posting resource. Video publish (pull-from-URL with status
 * polling), photo publish, upload-to-inbox (draft), file-upload init, publish
 * status fetch, and creator info.
 */
import { post, sleep } from "../GenericFunctions.js";

const VIDEO_FIELDS = ["id", "title", "video_description", "create_time", "like_count", "comment_count", "share_count", "view_count", "embed_link"];

function buildPostInfo(config) {
  const caption = config.caption || "";
  return {
    title: caption.slice(0, 2200),
    privacy_level: config.privacy || "PUBLIC_TO_EVERYONE",
    disable_duet: !config.duet,
    disable_stitch: !config.stitch,
    disable_comment: !config.comment,
    video_cover_timestamp_ms: Math.round((Number(config.coverTime) || 0) * 1000),
  };
}

async function opPublishVideo(config, token) {
  if (!config.videoUrl) return { success: false, error: "TikTok publishVideo: 'videoUrl' is required.", skipped: true };

  const initData = await post(token, `/post/publish/video/init/`, {
    post_info: buildPostInfo(config),
    source_info: { source: "PULL_FROM_URL", video_url: config.videoUrl },
  }, { timeout: 30000 });

  const publishId = initData.data?.publish_id;
  if (!publishId) throw new Error(`TikTok publishVideo: No publish_id returned — ${JSON.stringify(initData)}`);

  let attempts = 0;
  let videoStatus = null;
  while (attempts < 12) {
    await sleep(5000);
    const statusData = await post(token, `/post/publish/status/fetch/`, { publish_id: publishId });
    const s = statusData.data?.status;
    if (s === "PUBLISH_COMPLETE" || s === "SUCCESS") { videoStatus = statusData.data; break; }
    if (s === "FAILED" || s === "DENIED") throw new Error(`TikTok publishVideo: Publish failed — ${statusData.data?.fail_reason || "Unknown"}`);
    attempts++;
  }

  return {
    shareId: publishId,
    videoId: videoStatus?.video_id || null,
    shareUrl: videoStatus?.share_url || null,
    status: videoStatus?.status || "processing",
    publishedAt: new Date().toISOString(),
  };
}

async function opInitVideoUpload(config, token) {
  if (!config.videoSize) return { success: false, error: "TikTok initVideoUpload: 'videoSize' (bytes) is required.", skipped: true };
  const size = Number(config.videoSize);
  const chunkSize = Number(config.chunkSize) || size;
  const data = await post(token, `/post/publish/video/init/`, {
    post_info: buildPostInfo(config),
    source_info: {
      source: "FILE_UPLOAD",
      video_size: size,
      chunk_size: chunkSize,
      total_chunk_count: Math.max(1, Math.ceil(size / chunkSize)),
    },
  }, { timeout: 30000 });
  return { publishId: data.data?.publish_id, uploadUrl: data.data?.upload_url };
}

async function opUploadToInbox(config, token) {
  if (!config.videoUrl) return { success: false, error: "TikTok uploadToInbox: 'videoUrl' is required.", skipped: true };
  const data = await post(token, `/post/publish/inbox/video/init/`, {
    source_info: { source: "PULL_FROM_URL", video_url: config.videoUrl },
  }, { timeout: 30000 });
  return { publishId: data.data?.publish_id, status: "uploaded_to_inbox" };
}

async function opPublishPhoto(config, token) {
  if (!config.imageUrls) return { success: false, error: "TikTok publishPhoto: 'imageUrls' (comma-separated) is required.", skipped: true };
  const urls = String(config.imageUrls).split(",").map((s) => s.trim()).filter(Boolean);
  const data = await post(token, `/post/publish/content/init/`, {
    post_info: {
      title: (config.caption || "").slice(0, 90),
      description: (config.description || config.caption || "").slice(0, 2200),
      privacy_level: config.privacy || "PUBLIC_TO_EVERYONE",
      disable_comment: !config.comment,
      auto_add_music: config.autoAddMusic != null ? config.autoAddMusic : true,
    },
    source_info: { source: "PULL_FROM_URL", photo_cover_index: Number(config.coverIndex) || 0, photo_images: urls },
    post_mode: config.postMode || "DIRECT_POST",
    media_type: "PHOTO",
  }, { timeout: 30000 });
  return { publishId: data.data?.publish_id, success: true };
}

async function opGetPublishStatus(config, token) {
  if (!config.publishId) return { success: false, error: "TikTok getPublishStatus: 'publishId' is required.", skipped: true };
  const data = await post(token, `/post/publish/status/fetch/`, { publish_id: config.publishId });
  return data.data || data;
}

async function opGetCreatorInfo(config, token) {
  const data = await post(token, `/post/publish/creator_info/query/`, {}, { timeout: 10000 });
  return data.data || data;
}

async function opGetVideo(config, token) {
  if (!config.videoId) return { success: false, error: "TikTok getVideo: 'videoId' is required.", skipped: true };
  const data = await post(token, `/video/query/`, { video_ids: [config.videoId], fields: VIDEO_FIELDS }, { timeout: 10000 });
  return data.data?.videos?.[0] || data;
}

export const postOperations = {
  publishVideo: opPublishVideo,
  initVideoUpload: opInitVideoUpload,
  uploadToInbox: opUploadToInbox,
  publishPhoto: opPublishPhoto,
  getPublishStatus: opGetPublishStatus,
  getCreatorInfo: opGetCreatorInfo,
  getVideo: opGetVideo,
};

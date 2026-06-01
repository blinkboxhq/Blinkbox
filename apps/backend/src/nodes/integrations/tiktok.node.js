/**
 * TIKTOK NODE
 *
 * Operations (matches TikTokPostNode.jsx ConfigPanel):
 *   publishVideo   — Publish a video to TikTok via Content Posting API (primary frontend op)
 *   getUserInfo    — Get authenticated user's profile
 *   listVideos     — List the user's own videos
 *   getVideo       — Get a specific video by ID
 *
 * Auth: TikTok OAuth2 token stored in vault via getOAuthToken (auto-refreshes)
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://open.tiktokapis.com/v2";

function handleError(err) {
  if (err.message.startsWith("TikTok")) throw err;
  const status = err.response?.status;
  const code = err.response?.data?.error?.code;
  const msg = err.response?.data?.error?.message || err.message;
  if (status === 401 || code === "access_token_invalid") throw new Error("TikTok: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403 || code === "permission_denied") throw new Error(`TikTok: Permission denied — ${msg}. Ensure your app has the required scopes (video.publish, video.list).`);
  if (status === 404) throw new Error(`TikTok: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`TikTok: Bad request — ${msg}`);
  if (status === 429 || code === "rate_limit_exceeded") throw new Error("TikTok: Rate limit exceeded. Retry later.");
  if (status === 422) throw new Error(`TikTok: Unprocessable request — ${msg}`);
  throw new Error(`TikTok failed: ${status || err.code} — ${err.message}`);
}

function makeHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" };
}

async function opPublishVideo(config, token) {
  if (!config.videoUrl) return { success: false, error: "TikTok publishVideo: 'videoUrl' is required.", skipped: true };

  const privacyLevel = config.privacy || "PUBLIC_TO_EVERYONE";
  const caption = config.caption || "";

  const initPayload = {
    post_info: {
      title: caption.slice(0, 2200),
      privacy_level: privacyLevel,
      disable_duet: !config.duet,
      disable_stitch: !config.stitch,
      disable_comment: !config.comment,
      video_cover_timestamp_ms: Math.round((Number(config.coverTime) || 0) * 1000),
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: config.videoUrl,
    },
  };

  const { data: initData } = await axios.post(
    `${BASE}/post/publish/video/init/`,
    initPayload,
    { headers: makeHeaders(token), timeout: 30000 },
  );

  const publishId = initData.data?.publish_id;
  if (!publishId) throw new Error(`TikTok publishVideo: No publish_id returned — ${JSON.stringify(initData)}`);

  const statusPayload = { publish_id: publishId };
  let attempts = 0;
  let videoStatus = null;

  while (attempts < 12) {
    await new Promise((r) => setTimeout(r, 5000));
    const { data: statusData } = await axios.post(
      `${BASE}/post/publish/status/fetch/`,
      statusPayload,
      { headers: makeHeaders(token), timeout: 15000 },
    );
    const s = statusData.data?.status;
    if (s === "PUBLISH_COMPLETE" || s === "SUCCESS") {
      videoStatus = statusData.data;
      break;
    }
    if (s === "FAILED" || s === "DENIED") {
      const failReason = statusData.data?.fail_reason || "Unknown";
      throw new Error(`TikTok publishVideo: Publish failed — ${failReason}`);
    }
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

async function opGetUserInfo(config, token) {
  const { data } = await axios.post(
    `${BASE}/user/info/`,
    {
      fields: [
        "open_id", "union_id", "avatar_url", "display_name",
        "bio_description", "follower_count", "following_count",
        "likes_count", "video_count",
      ],
    },
    { headers: makeHeaders(token), timeout: 10000 },
  );
  return data.data?.user || data;
}

async function opListVideos(config, token) {
  const { data } = await axios.post(
    `${BASE}/video/list/`,
    {
      max_count: Number(config.limit) || 20,
      fields: [
        "id", "title", "video_description", "create_time",
        "like_count", "comment_count", "share_count", "view_count", "embed_link",
      ],
    },
    { headers: makeHeaders(token), timeout: 15000 },
  );
  return { videos: data.data?.videos || [], cursor: data.data?.cursor };
}

async function opGetVideo(config, token) {
  const id = config.videoId;
  if (!id) return { success: false, error: "TikTok getVideo: 'videoId' is required.", skipped: true };
  const { data } = await axios.post(
    `${BASE}/video/query/`,
    {
      video_ids: [id],
      fields: [
        "id", "title", "video_description", "create_time",
        "like_count", "comment_count", "share_count", "view_count", "embed_link",
      ],
    },
    { headers: makeHeaders(token), timeout: 10000 },
  );
  return data.data?.videos?.[0] || data;
}

const OPERATIONS = {
  publishVideo: opPublishVideo,
  getUserInfo: opGetUserInfo,
  listVideos: opListVideos,
  getVideo: opGetVideo,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "publishVideo";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`TikTok: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("TikTok: No credential configured — link a TikTok OAuth connection first.");

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "TikTok");
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

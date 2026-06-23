/**
 * YOUTUBE NODE
 *
 * Operations (matches YouTubeUploadNode.jsx ConfigPanel):
 *   uploadVideo      — Upload a video via YouTube Data API v3 (resumable upload)
 *
 * The legacy read-only operations (searchVideos, getVideo, etc.) are also kept
 * so existing automations aren't broken.
 *
 * Auth: Google OAuth2 token (stored via getOAuthToken — auto-refreshes)
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const DATA_API = "https://www.googleapis.com/youtube/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos";

function handleError(err) {
  if (err.message.startsWith("YouTube")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message || err.message;
  if (status === 401) throw new Error("YouTube: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`YouTube: Permission denied — ${msg}. Ensure the channel is verified and the API has upload scope.`);
  if (status === 404) throw new Error(`YouTube: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`YouTube: Bad request — ${msg}`);
  if (status === 429) throw new Error("YouTube: Quota exceeded. The YouTube Data API daily quota has been reached.");
  if (status === 413) throw new Error("YouTube: Video file too large for this upload method.");
  throw new Error(`YouTube failed: ${status || err.code} — ${err.message}`);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function opUploadVideo(config, token) {
  if (!config.videoUrl) return { success: false, error: "YouTube uploadVideo: 'videoUrl' is required.", skipped: true };
  if (!config.title) return { success: false, error: "YouTube uploadVideo: 'title' is required.", skipped: true };

  const privacy = config.privacy || "public";
  const category = config.category || "22";
  const tags = config.tags
    ? String(config.tags).split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const metadata = {
    snippet: {
      title: config.title,
      description: config.description || "",
      tags,
      categoryId: String(category),
      defaultLanguage: config.language || "en",
    },
    status: {
      privacyStatus: privacy,
      selfDeclaredMadeForKids: false,
      ...(config.notifySubscribers === false ? { shouldNotifySubscribers: false } : {}),
    },
  };

  let videoBuffer;
  try {
    const resp = await axios.get(config.videoUrl, { responseType: "arraybuffer", timeout: 120000, maxContentLength: 500 * 1024 * 1024 });
    videoBuffer = Buffer.from(resp.data);
  } catch (err) {
    throw new Error(`YouTube uploadVideo: Failed to fetch video from URL — ${err.message}`);
  }

  const initRes = await axios.post(
    `${UPLOAD_API}?uploadType=resumable&part=snippet,status`,
    metadata,
    {
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": String(videoBuffer.length),
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
      timeout: 20000,
    },
  );

  const resumableUrl = initRes.headers?.location;
  if (!resumableUrl) throw new Error("YouTube uploadVideo: Failed to initiate resumable upload session.");

  const uploadRes = await axios.put(resumableUrl, videoBuffer, {
    headers: {
      ...authHeaders(token),
      "Content-Type": "video/*",
      "Content-Length": String(videoBuffer.length),
    },
    timeout: 300000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const video = uploadRes.data;
  const videoId = video.id;
  const result = {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: video.snippet?.title,
    privacy: video.status?.privacyStatus,
    uploadedAt: new Date().toISOString(),
  };

  if (config.thumbnail) {
    try {
      const thumbResp = await axios.get(config.thumbnail, { responseType: "arraybuffer", timeout: 30000 });
      await axios.post(
        `${DATA_API}/thumbnails/set?videoId=${videoId}`,
        Buffer.from(thumbResp.data),
        { headers: { ...authHeaders(token), "Content-Type": "image/jpeg" }, timeout: 30000 },
      );
      result.thumbnailSet = true;
    } catch {
      result.thumbnailSet = false;
    }
  }

  if (config.playlist) {
    try {
      await axios.post(
        `${DATA_API}/playlistItems?part=snippet`,
        { snippet: { playlistId: config.playlist, resourceId: { kind: "youtube#video", videoId } } },
        { headers: { ...authHeaders(token), "Content-Type": "application/json" }, timeout: 15000 },
      );
      result.addedToPlaylist = config.playlist;
    } catch {
      result.addedToPlaylist = false;
    }
  }

  return result;
}

async function opSearchVideos(config, token) {
  if (!config.query) return { success: false, error: "YouTube searchVideos: 'query' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/search`, {
    headers: authHeaders(token),
    params: {
      part: "snippet",
      q: config.query,
      type: "video",
      maxResults: Number(config.maxResults) || 10,
      order: config.order || "relevance",
    },
    timeout: 15000,
  });
  return { success: true, items: data.items, totalResults: data.pageInfo?.totalResults };
}

async function opGetVideo(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube getVideo: 'videoId' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/videos`, {
    headers: authHeaders(token),
    params: { part: "snippet,statistics,contentDetails", id: config.videoId },
    timeout: 10000,
  });
  return { success: true, ...data.items?.[0] };
}

async function opListChannelVideos(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube listChannelVideos: 'channelId' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/search`, {
    headers: authHeaders(token),
    params: {
      part: "snippet",
      channelId: config.channelId,
      type: "video",
      maxResults: Number(config.maxResults) || 20,
      order: config.order || "date",
    },
    timeout: 15000,
  });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opGetChannel(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube getChannel: 'channelId' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/channels`, {
    headers: authHeaders(token),
    params: { part: "snippet,statistics,brandingSettings", id: config.channelId },
    timeout: 10000,
  });
  return { success: true, ...data.items?.[0] };
}

async function opListPlaylists(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube listPlaylists: 'channelId' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/playlists`, {
    headers: authHeaders(token),
    params: { part: "snippet,contentDetails", channelId: config.channelId, maxResults: Number(config.maxResults) || 20 },
    timeout: 10000,
  });
  return { success: true, items: data.items };
}

async function opGetComments(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube getComments: 'videoId' is required.", skipped: true };
  const { data } = await axios.get(`${DATA_API}/commentThreads`, {
    headers: authHeaders(token),
    params: {
      part: "snippet",
      videoId: config.videoId,
      maxResults: Number(config.maxResults) || 20,
      order: config.order || "relevance",
    },
    timeout: 10000,
  });
  return { success: true, items: data.items };
}

const OPERATIONS = {
  uploadVideo: opUploadVideo,
  searchVideos: opSearchVideos,
  getVideo: opGetVideo,
  listChannelVideos: opListChannelVideos,
  getChannel: opGetChannel,
  listPlaylists: opListPlaylists,
  getComments: opGetComments,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "uploadVideo";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`YouTube: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("YouTube: No credential configured — link a Google OAuth connection first.");

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "YouTube");
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

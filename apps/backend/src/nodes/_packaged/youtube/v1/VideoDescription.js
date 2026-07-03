/**
 * YouTube — Video resource. Upload (resumable), search, get, update metadata,
 * delete, rate/getRating, report abuse, set thumbnail, and list a channel's
 * uploads. Handlers receive the raw OAuth access token.
 */
import axios from "axios";
import {
  DATA_API,
  UPLOAD_API,
  authHeaders,
  get,
  post,
  put,
  del,
  boundResults,
  csvList,
  fetchBinary,
} from "../GenericFunctions.js";

async function opUploadVideo(config, token) {
  if (!config.videoUrl) return { success: false, error: "YouTube uploadVideo: 'videoUrl' is required.", skipped: true };
  if (!config.title) return { success: false, error: "YouTube uploadVideo: 'title' is required.", skipped: true };

  const privacy = config.privacy || "public";
  const category = config.category || "22";
  const tags = csvList(config.tags);

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
      selfDeclaredMadeForKids: config.madeForKids === true,
      ...(config.notifySubscribers === false ? { shouldNotifySubscribers: false } : {}),
      ...(config.publishAt ? { publishAt: config.publishAt, privacyStatus: "private" } : {}),
    },
  };

  let videoBuffer;
  try {
    videoBuffer = await fetchBinary(config.videoUrl);
  } catch (err) {
    throw new Error(`YouTube uploadVideo: Failed to fetch video from URL — ${err.message}`);
  }

  const initRes = await axios.post(`${UPLOAD_API}?uploadType=resumable&part=snippet,status`, metadata, {
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
      "X-Upload-Content-Type": "video/*",
      "X-Upload-Content-Length": String(videoBuffer.length),
    },
    maxRedirects: 0,
    validateStatus: (s) => s < 400,
    timeout: 20000,
  });

  const resumableUrl = initRes.headers?.location;
  if (!resumableUrl) throw new Error("YouTube uploadVideo: Failed to initiate resumable upload session.");

  const uploadRes = await axios.put(resumableUrl, videoBuffer, {
    headers: { ...authHeaders(token), "Content-Type": "video/*", "Content-Length": String(videoBuffer.length) },
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
      const thumbBuf = await fetchBinary(config.thumbnail, { timeout: 30000, maxBytes: 4 * 1024 * 1024 });
      await axios.post(`${DATA_API}/thumbnails/set?videoId=${videoId}`, thumbBuf, {
        headers: { ...authHeaders(token), "Content-Type": "image/jpeg" },
        timeout: 30000,
      });
      result.thumbnailSet = true;
    } catch {
      result.thumbnailSet = false;
    }
  }

  if (config.playlist) {
    try {
      await post(token, `/playlistItems`, {
        snippet: { playlistId: config.playlist, resourceId: { kind: "youtube#video", videoId } },
      }, { params: { part: "snippet" } });
      result.addedToPlaylist = config.playlist;
    } catch {
      result.addedToPlaylist = false;
    }
  }

  return result;
}

async function opSearchVideos(config, token) {
  if (!config.query) return { success: false, error: "YouTube searchVideos: 'query' is required.", skipped: true };
  const params = {
    part: "snippet",
    q: config.query,
    type: "video",
    maxResults: boundResults(config.maxResults, 10),
    order: config.order || "relevance",
  };
  if (config.pageToken) params.pageToken = config.pageToken;
  if (config.regionCode) params.regionCode = config.regionCode;
  if (config.publishedAfter) params.publishedAfter = config.publishedAfter;
  if (config.publishedBefore) params.publishedBefore = config.publishedBefore;
  if (config.videoDuration) params.videoDuration = config.videoDuration;
  const data = await get(token, `/search`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken, totalResults: data.pageInfo?.totalResults };
}

async function opGetVideo(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube getVideo: 'videoId' is required.", skipped: true };
  const data = await get(token, `/videos`, {
    params: { part: config.part || "snippet,statistics,contentDetails,status", id: config.videoId },
    timeout: 10000,
  });
  return { success: true, ...data.items?.[0] };
}

async function opListVideos(config, token) {
  if (!config.videoIds) return { success: false, error: "YouTube listVideos: 'videoIds' (comma-separated) is required.", skipped: true };
  const data = await get(token, `/videos`, {
    params: { part: config.part || "snippet,statistics,contentDetails", id: csvList(config.videoIds).join(",") },
  });
  return { success: true, items: data.items };
}

async function opUpdateVideo(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube updateVideo: 'videoId' is required.", skipped: true };
  const current = await get(token, `/videos`, { params: { part: "snippet,status", id: config.videoId } });
  const existing = current.items?.[0];
  if (!existing) return { success: false, error: `YouTube updateVideo: Video "${config.videoId}" not found.`, skipped: true };

  const snippet = { ...existing.snippet };
  if (config.title != null) snippet.title = config.title;
  if (config.description != null) snippet.description = config.description;
  if (config.tags != null) snippet.tags = csvList(config.tags);
  if (config.category != null) snippet.categoryId = String(config.category);
  const status = { ...existing.status };
  if (config.privacy != null) status.privacyStatus = config.privacy;

  const data = await put(token, `/videos`, { id: config.videoId, snippet, status }, { params: { part: "snippet,status" } });
  return { success: true, ...data };
}

async function opDeleteVideo(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube deleteVideo: 'videoId' is required.", skipped: true };
  await del(token, `/videos`, { params: { id: config.videoId } });
  return { success: true, deleted: config.videoId };
}

async function opRateVideo(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube rateVideo: 'videoId' is required.", skipped: true };
  const rating = config.rating || "like";
  await post(token, `/videos/rate`, {}, { params: { id: config.videoId, rating } });
  return { success: true, videoId: config.videoId, rating };
}

async function opGetVideoRating(config, token) {
  if (!config.videoIds && !config.videoId) return { success: false, error: "YouTube getVideoRating: 'videoId' or 'videoIds' is required.", skipped: true };
  const ids = config.videoIds ? csvList(config.videoIds).join(",") : config.videoId;
  const data = await get(token, `/videos/getRating`, { params: { id: ids } });
  return { success: true, items: data.items };
}

async function opReportAbuse(config, token) {
  if (!config.videoId || !config.reasonId) return { success: false, error: "YouTube reportAbuse: 'videoId' and 'reasonId' are required.", skipped: true };
  const body = { videoId: config.videoId, reasonId: config.reasonId };
  if (config.secondaryReasonId) body.secondaryReasonId = config.secondaryReasonId;
  if (config.comments) body.comments = config.comments;
  await post(token, `/videos/reportAbuse`, body);
  return { success: true, reported: config.videoId };
}

async function opSetThumbnail(config, token) {
  if (!config.videoId) return { success: false, error: "YouTube setThumbnail: 'videoId' is required.", skipped: true };
  if (!config.thumbnail) return { success: false, error: "YouTube setThumbnail: 'thumbnail' URL is required.", skipped: true };
  const thumbBuf = await fetchBinary(config.thumbnail, { timeout: 30000, maxBytes: 4 * 1024 * 1024 });
  const { data } = await axios.post(`${DATA_API}/thumbnails/set?videoId=${config.videoId}`, thumbBuf, {
    headers: { ...authHeaders(token), "Content-Type": "image/jpeg" },
    timeout: 30000,
  });
  return { success: true, videoId: config.videoId, thumbnails: data.items?.[0] };
}

async function opListChannelVideos(config, token) {
  if (!config.channelId) return { success: false, error: "YouTube listChannelVideos: 'channelId' is required.", skipped: true };
  const params = {
    part: "snippet",
    channelId: config.channelId,
    type: "video",
    maxResults: boundResults(config.maxResults, 20),
    order: config.order || "date",
  };
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/search`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opListCategories(config, token) {
  const data = await get(token, `/videoCategories`, {
    params: { part: "snippet", regionCode: config.regionCode || "US" },
  });
  return { success: true, items: data.items };
}

export const videoOperations = {
  uploadVideo: opUploadVideo,
  searchVideos: opSearchVideos,
  getVideo: opGetVideo,
  listVideos: opListVideos,
  updateVideo: opUpdateVideo,
  deleteVideo: opDeleteVideo,
  rateVideo: opRateVideo,
  getVideoRating: opGetVideoRating,
  reportAbuse: opReportAbuse,
  setThumbnail: opSetThumbnail,
  listChannelVideos: opListChannelVideos,
  listCategories: opListCategories,
};

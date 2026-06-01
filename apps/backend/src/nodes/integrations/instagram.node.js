/**
 * INSTAGRAM NODE
 *
 * Operations (matches instagram/meta.js ConfigPanel):
 *   getUserMedia — List the authenticated user's media
 *   getUserInfo  — Get profile info
 *   getMedia     — Get a single media item by ID
 *   createPost   — Publish an image post (two-step: container → publish)
 *   getComments  — List comments on a media item
 *
 * Auth: Instagram OAuth token via getOAuthToken (auto-refreshes)
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://graph.instagram.com/v18.0";

function handleError(err) {
  if (err.message.startsWith("Instagram")) throw err;
  const status = err.response?.status;
  const msg =
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message;
  const code = err.response?.data?.error?.code;
  if (status === 401 || code === 190) throw new Error("Instagram: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403 || code === 10 || code === 200) throw new Error(`Instagram: Permission denied — ${msg}. Ensure the app has the required scopes.`);
  if (status === 404) throw new Error(`Instagram: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Instagram: Bad request — ${msg}`);
  if (status === 429) throw new Error("Instagram: Rate limit exceeded. Retry later.");
  if (status === 422) throw new Error(`Instagram: Unprocessable content — ${msg}`);
  throw new Error(`Instagram failed: ${status || err.code} — ${err.message}`);
}

async function opGetUserInfo(config, token) {
  const { data } = await axios.get(`${BASE}/me`, {
    params: {
      access_token: token,
      fields: "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website",
    },
    timeout: 10000,
  });
  return data;
}

async function opGetUserMedia(config, token) {
  const { data } = await axios.get(`${BASE}/me/media`, {
    params: {
      access_token: token,
      fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink",
      limit: config.limit || 20,
    },
    timeout: 15000,
  });
  return { media: data.data, cursor: data.paging?.cursors };
}

async function opGetMedia(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getMedia: 'mediaId' is required.", skipped: true };
  const { data } = await axios.get(`${BASE}/${config.mediaId}`, {
    params: {
      access_token: token,
      fields: "id,caption,media_type,media_url,timestamp,like_count,comments_count,permalink",
    },
    timeout: 10000,
  });
  return data;
}

async function opCreatePost(config, token) {
  if (!config.imageUrl) return { success: false, error: "Instagram createPost: 'imageUrl' is required.", skipped: true };
  if (!config.userId) return { success: false, error: "Instagram createPost: 'userId' (Instagram user ID) is required.", skipped: true };

  const caption = config.caption || "";

  const { data: container } = await axios.post(
    `${BASE}/${config.userId}/media`,
    null,
    {
      params: { access_token: token, image_url: config.imageUrl, caption },
      timeout: 15000,
    },
  );

  if (!container.id) throw new Error("Instagram createPost: Failed to create media container — no ID returned.");

  const { data: published } = await axios.post(
    `${BASE}/${config.userId}/media_publish`,
    null,
    {
      params: { access_token: token, creation_id: container.id },
      timeout: 15000,
    },
  );

  return { id: published.id, containerId: container.id, success: true };
}

async function opGetComments(config, token) {
  if (!config.mediaId) return { success: false, error: "Instagram getComments: 'mediaId' is required.", skipped: true };
  const { data } = await axios.get(`${BASE}/${config.mediaId}/comments`, {
    params: {
      access_token: token,
      fields: "id,text,timestamp,username",
      limit: config.limit || 20,
    },
    timeout: 10000,
  });
  return { comments: data.data, total: data.data?.length };
}

const OPERATIONS = {
  getUserInfo: opGetUserInfo,
  getUserMedia: opGetUserMedia,
  getMedia: opGetMedia,
  createPost: opCreatePost,
  getComments: opGetComments,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getUserMedia";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Instagram: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("Instagram: No credential configured — link an Instagram OAuth connection first.");

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Instagram");
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

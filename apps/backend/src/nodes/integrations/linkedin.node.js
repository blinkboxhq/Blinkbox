/**
 * LINKEDIN NODE
 *
 * Operations (matches LinkedInPostNode.jsx ConfigPanel):
 *   sharePost      — Publish text, image, video, article, document or poll
 *                    Supports posting as person or organization (company page)
 *   getProfile     — Get the authenticated user's profile
 *   getCompany     — Get organization details by company ID
 *   getConnections — List first-degree connections (requires r_network scope)
 *
 * Auth: LinkedIn OAuth2 token stored in vault via getOAuthToken
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.linkedin.com/v2";
const UPLOAD_BASE = "https://api.linkedin.com/v2";

function handleError(err) {
  if (err.message.startsWith("LinkedIn")) throw err;
  const status = err.response?.status;
  const msg =
    err.response?.data?.message ||
    err.response?.data?.error_description ||
    err.response?.data?.serviceErrorCode ||
    err.message;
  if (status === 401) throw new Error("LinkedIn: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`LinkedIn: Permission denied — ${msg}. Check your app's OAuth scopes (w_member_social, r_organization_social).`);
  if (status === 404) throw new Error(`LinkedIn: Resource not found — ${msg}`);
  if (status === 422 || status === 400) throw new Error(`LinkedIn: Bad request — ${msg}`);
  if (status === 429) throw new Error("LinkedIn: Rate limit exceeded. Retry later.");
  throw new Error(`LinkedIn failed: ${status || err.code} — ${err.message}`);
}

function headers(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    ...extra,
  };
}

async function getPersonUrn(token) {
  const { data } = await axios.get(`${BASE}/me`, { headers: headers(token), timeout: 10000 });
  return `urn:li:person:${data.id}`;
}

async function uploadMedia(token, authorUrn, mediaUrl, mediaType) {
  const registerPayload = {
    registerUploadRequest: {
      owner: authorUrn,
      recipes: [mediaType === "video" ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
    },
  };

  const { data: regData } = await axios.post(
    `${UPLOAD_BASE}/assets?action=registerUpload`,
    registerPayload,
    { headers: headers(token), timeout: 15000 },
  );

  const asset = regData.value?.asset;
  const uploadUrl = regData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!uploadUrl || !asset) throw new Error("LinkedIn: Failed to register media upload.");

  const mediaResp = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 60000 });
  await axios.put(uploadUrl, Buffer.from(mediaResp.data), {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    timeout: 120000,
    maxBodyLength: Infinity,
  });

  return asset;
}

async function opSharePost(config, token) {
  const text = config.text || config.content || "";
  if (!text && config.type !== "poll") return { success: false, error: "LinkedIn sharePost: 'text' is required.", skipped: true };

  const postAs = config.postAs || "person";
  let authorUrn;
  if (postAs === "organization") {
    if (!config.orgId) return { success: false, error: "LinkedIn sharePost: 'orgId' is required when posting as organization.", skipped: true };
    const orgId = String(config.orgId).replace(/^urn:li:organization:/, "");
    authorUrn = `urn:li:organization:${orgId}`;
  } else {
    authorUrn = await getPersonUrn(token);
  }

  const type = config.type || "text";
  const visibility = config.visibility || "PUBLIC";

  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: "NONE",
  };

  if (type === "article") {
    if (!config.linkUrl) return { success: false, error: "LinkedIn sharePost (article): 'linkUrl' is required.", skipped: true };
    shareContent.shareMediaCategory = "ARTICLE";
    shareContent.media = [{
      status: "READY",
      originalUrl: config.linkUrl,
      ...(config.title ? { title: { text: config.title } } : {}),
      ...(config.description ? { description: { text: config.description } } : {}),
    }];
  } else if (type === "image") {
    if (!config.mediaUrl) return { success: false, error: "LinkedIn sharePost (image): 'mediaUrl' is required.", skipped: true };
    const asset = await uploadMedia(token, authorUrn, config.mediaUrl, "image");
    shareContent.shareMediaCategory = "IMAGE";
    shareContent.media = [{
      status: "READY",
      media: asset,
      ...(config.title ? { title: { text: config.title } } : {}),
    }];
  } else if (type === "video") {
    if (!config.mediaUrl) return { success: false, error: "LinkedIn sharePost (video): 'mediaUrl' is required.", skipped: true };
    const asset = await uploadMedia(token, authorUrn, config.mediaUrl, "video");
    shareContent.shareMediaCategory = "VIDEO";
    shareContent.media = [{
      status: "READY",
      media: asset,
      ...(config.title ? { title: { text: config.title } } : {}),
    }];
  } else if (type === "document") {
    if (!config.mediaUrl) return { success: false, error: "LinkedIn sharePost (document): 'mediaUrl' is required.", skipped: true };
    const asset = await uploadMedia(token, authorUrn, config.mediaUrl, "image");
    shareContent.shareMediaCategory = "DOCUMENT";
    shareContent.media = [{
      status: "READY",
      media: asset,
      ...(config.title ? { title: { text: config.title } } : {}),
    }];
  } else if (type === "poll") {
    const question = config.text || config.pollQuestion;
    const opts = config.pollOptions;
    const options = Array.isArray(opts)
      ? opts
      : typeof opts === "string"
        ? opts.split(",").map((o) => o.trim()).filter(Boolean)
        : [];
    if (!question) return { success: false, error: "LinkedIn sharePost (poll): 'text' (poll question) is required.", skipped: true };
    if (options.length < 2) return { success: false, error: "LinkedIn sharePost (poll): at least 2 poll options are required.", skipped: true };

    const pollPayload = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: question },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility },
    };
    const { data } = await axios.post(`${BASE}/ugcPosts`, pollPayload, { headers: headers(token), timeout: 15000 });
    return { id: data.id, success: true, authorUrn, type: "poll", note: "Poll creation requires LinkedIn Partner API access for full poll support." };
  }

  const post = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility },
  };

  const { data } = await axios.post(`${BASE}/ugcPosts`, post, { headers: headers(token), timeout: 15000 });
  return {
    postId: data.id,
    postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
    visibility,
    publishedAt: new Date().toISOString(),
    authorUrn,
  };
}

async function opGetProfile(config, token) {
  const { data } = await axios.get(
    `${BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),vanityName)`,
    { headers: headers(token), timeout: 10000 },
  );
  const firstName = data.firstName?.localized?.en_US || Object.values(data.firstName?.localized || {})[0] || "";
  const lastName = data.lastName?.localized?.en_US || Object.values(data.lastName?.localized || {})[0] || "";
  return {
    id: data.id,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    vanityName: data.vanityName || null,
  };
}

async function opGetCompany(config, token) {
  const id = config.companyId;
  if (!id) return { success: false, error: "LinkedIn getCompany: 'companyId' is required.", skipped: true };
  const { data } = await axios.get(
    `${BASE}/organizations/${id}?projection=(id,name,vanityName,description,websiteUrl,logoV2)`,
    { headers: headers(token), timeout: 10000 },
  );
  const name = data.name?.localized?.en_US || Object.values(data.name?.localized || {})[0] || "";
  return {
    id: data.id,
    name,
    vanityName: data.vanityName || null,
    description: data.description?.localized?.en_US || null,
    websiteUrl: data.websiteUrl || null,
  };
}

async function opGetConnections(config, token) {
  const count = parseInt(config.limit) || 50;
  const { data } = await axios.get(
    `${BASE}/connections?q=viewer&start=0&count=${count}`,
    { headers: headers(token), timeout: 15000 },
  );
  const connections = (data.elements || []).map((el) => ({
    id: el.id,
    firstName: el.firstName?.localized?.en_US || "",
    lastName: el.lastName?.localized?.en_US || "",
  }));
  return { connections, total: data.paging?.total ?? connections.length };
}

const OPERATIONS = {
  sharePost: opSharePost,
  getProfile: opGetProfile,
  getCompany: opGetCompany,
  getConnections: opGetConnections,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sharePost";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`LinkedIn: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("LinkedIn: No credential configured — link a LinkedIn OAuth connection first.");

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "LinkedIn");
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

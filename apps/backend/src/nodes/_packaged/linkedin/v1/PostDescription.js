/**
 * LinkedIn — Post/Share resource. The primary sharePost flow (text, image,
 * video, article, document, poll — as person or organization) is preserved
 * verbatim from the original node. Adds the versioned /rest Posts API for
 * plain create/get/delete/reshare where a member token allows it. Handlers
 * receive the raw bearer token: (config, token).
 */
import axios from "axios";
import {
  BASE,
  REST_BASE,
  headers,
  restHeaders,
  resolveAuthorUrn,
  getPersonUrn,
  uploadMedia,
  toList,
} from "../GenericFunctions.js";

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
    const linkUrl = config.linkUrl || config.url;
    if (!linkUrl) return { success: false, error: "LinkedIn sharePost (article): 'url' (article URL) is required.", skipped: true };
    shareContent.shareMediaCategory = "ARTICLE";
    shareContent.media = [{
      status: "READY",
      originalUrl: linkUrl,
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
    const { data } = await axios.post(`${BASE}/ugcPosts`, pollPayload, { headers: headers(token), timeout: 120000 });
    return { id: data.id, success: true, authorUrn, type: "poll", note: "Poll creation requires LinkedIn Partner API access for full poll support." };
  }

  const post = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility },
  };

  const { data } = await axios.post(`${BASE}/ugcPosts`, post, { headers: headers(token), timeout: 120000 });
  return {
    postId: data.id,
    postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
    visibility,
    publishedAt: new Date().toISOString(),
    authorUrn,
  };
}

/** Versioned /rest Posts API — plain text create (returns x-restli-id URN). */
async function opCreatePost(config, token) {
  const text = config.text || config.content || config.commentary;
  if (!text) return { success: false, error: "LinkedIn createPost: 'text' is required.", skipped: true };
  const authorUrn = await resolveAuthorUrn(config, token);
  if (!authorUrn) return { success: false, error: "LinkedIn createPost: 'orgId' is required when posting as organization.", skipped: true };

  const body = {
    author: authorUrn,
    commentary: text,
    visibility: config.visibility || "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: config.disableReshare === true,
  };
  const { headers: respHeaders, data } = await axios.post(`${REST_BASE}/posts`, body, {
    headers: restHeaders(token),
    timeout: 120000,
  });
  const id = respHeaders["x-restli-id"] || data?.id;
  return { postId: id, postUrl: id ? `https://www.linkedin.com/feed/update/${id}` : null, authorUrn, publishedAt: new Date().toISOString() };
}

async function opGetPost(config, token) {
  const id = config.postId || config.postUrn;
  if (!id) return { success: false, error: "LinkedIn getPost: 'postId' (URN) is required.", skipped: true };
  const { data } = await axios.get(`${REST_BASE}/posts/${encodeURIComponent(id)}`, {
    headers: restHeaders(token),
    timeout: 120000,
  });
  return {
    id: data.id,
    author: data.author,
    commentary: data.commentary,
    visibility: data.visibility,
    lifecycleState: data.lifecycleState,
    createdAt: data.createdAt,
  };
}

async function opDeletePost(config, token) {
  const id = config.postId || config.postUrn;
  if (!id) return { success: false, error: "LinkedIn deletePost: 'postId' (URN) is required.", skipped: true };
  await axios.delete(`${REST_BASE}/posts/${encodeURIComponent(id)}`, {
    headers: restHeaders(token),
    timeout: 120000,
  });
  return { deleted: true, id };
}

async function opUpdatePost(config, token) {
  const id = config.postId || config.postUrn;
  if (!id) return { success: false, error: "LinkedIn updatePost: 'postId' (URN) is required.", skipped: true };
  const text = config.text || config.content || config.commentary;
  if (!text) return { success: false, error: "LinkedIn updatePost: 'text' is required.", skipped: true };
  await axios.post(
    `${REST_BASE}/posts/${encodeURIComponent(id)}`,
    { patch: { $set: { commentary: text } } },
    { headers: restHeaders(token, { "X-RestLi-Method": "PARTIAL_UPDATE" }), timeout: 120000 },
  );
  return { updated: true, id, commentary: text };
}

async function opResharePost(config, token) {
  const parent = config.postId || config.postUrn || config.reshareOf;
  if (!parent) return { success: false, error: "LinkedIn resharePost: 'postId' (URN to reshare) is required.", skipped: true };
  const authorUrn = await resolveAuthorUrn(config, token);
  if (!authorUrn) return { success: false, error: "LinkedIn resharePost: 'orgId' is required when posting as organization.", skipped: true };
  const body = {
    author: authorUrn,
    commentary: config.text || config.content || "",
    visibility: config.visibility || "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    reshareContext: { parent },
  };
  const { headers: respHeaders } = await axios.post(`${REST_BASE}/posts`, body, {
    headers: restHeaders(token),
    timeout: 120000,
  });
  const id = respHeaders["x-restli-id"];
  return { postId: id, reshareOf: parent, authorUrn };
}

async function opListOrgPosts(config, token) {
  if (!config.orgId) return { success: false, error: "LinkedIn listOrgPosts: 'orgId' is required.", skipped: true };
  const orgId = String(config.orgId).replace(/^urn:li:organization:/, "");
  const authorUrn = encodeURIComponent(`urn:li:organization:${orgId}`);
  const count = Math.min(parseInt(config.limit) || 10, 100);
  const { data } = await axios.get(
    `${REST_BASE}/posts?q=author&author=${authorUrn}&count=${count}&sortBy=LAST_MODIFIED`,
    { headers: restHeaders(token), timeout: 120000 },
  );
  const posts = (data.elements || []).map((p) => ({
    id: p.id,
    author: p.author,
    commentary: p.commentary,
    visibility: p.visibility,
    createdAt: p.createdAt,
    lifecycleState: p.lifecycleState,
  }));
  return { posts, count: posts.length };
}

export const postOperations = {
  sharePost: opSharePost,
  createPost: opCreatePost,
  getPost: opGetPost,
  deletePost: opDeletePost,
  updatePost: opUpdatePost,
  resharePost: opResharePost,
  listOrgPosts: opListOrgPosts,
};

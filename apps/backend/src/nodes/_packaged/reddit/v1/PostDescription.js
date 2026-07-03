/**
 * Reddit — Post resource. Listing (hot/new/top/rising), get-with-comments,
 * submit (self/link), search (global + per-subreddit), vote, save/unsave,
 * hide/unhide, edit, delete, and duplicates. Handlers receive { headers }.
 */
import { get, postForm, boundLimit, mapPost, mapComment } from "../GenericFunctions.js";

async function opListPosts(config, client) {
  const sub = config.subreddit || "popular";
  const sort = config.sort || "hot";
  const params = { limit: boundLimit(config.limit) };
  if (config.after) params.after = config.after;
  if (config.time && ["top", "controversial"].includes(sort)) params.t = config.time;
  const data = await get(client, `/r/${encodeURIComponent(sub)}/${encodeURIComponent(sort)}.json`, { params });
  const posts = (data.data?.children || []).map(mapPost);
  return { posts, count: posts.length, subreddit: sub, after: data.data?.after };
}

async function opGetPost(config, client) {
  const id = config.postId;
  if (!id) return { success: false, error: "Reddit getPost: 'postId' required.", skipped: true };
  const data = await get(client, `/comments/${encodeURIComponent(id)}.json`, { params: { limit: boundLimit(config.limit, 50) } });
  const p = data[0]?.data?.children?.[0]?.data;
  if (!p) return { success: false, error: `Reddit getPost: Post "${id}" not found.`, skipped: true };
  const comments = (data[1]?.data?.children || []).filter((c) => c.kind === "t1").map(mapComment);
  return { id: p.id, title: p.title, body: p.selftext, url: p.url, score: p.score, upvoteRatio: p.upvote_ratio, author: p.author, subreddit: p.subreddit, comments };
}

async function opSubmitPost(config, client) {
  const sub = config.subreddit;
  if (!sub) return { success: false, error: "Reddit submitPost: 'subreddit' required.", skipped: true };
  if (!config.title) return { success: false, error: "Reddit submitPost: 'title' required.", skipped: true };
  const kind = config.kind || "self";
  const data = await postForm(client, `/api/submit`, {
    sr: sub,
    kind,
    title: config.title,
    text: kind === "self" ? config.text || "" : undefined,
    url: kind === "link" ? config.url || "" : undefined,
    nsfw: config.nsfw === true,
    spoiler: config.spoiler === true,
    flair_id: config.flairId,
    flair_text: config.flairText,
    sendreplies: config.sendReplies !== false,
    api_type: "json",
  });
  const errs = data.json?.errors || [];
  return { success: !errs.length, id: data.json?.data?.id, name: data.json?.data?.name, url: data.json?.data?.url, errors: errs };
}

async function opSearch(config, client) {
  const q = config.query || "";
  if (!q) return { success: false, error: "Reddit search: 'query' required.", skipped: true };
  const params = { q, limit: boundLimit(config.limit), sort: config.sort || "relevance", type: "link" };
  if (config.time) params.t = config.time;
  let path = `/search.json`;
  if (config.subreddit) {
    path = `/r/${encodeURIComponent(config.subreddit)}/search.json`;
    params.restrict_sr = true;
  }
  const data = await get(client, path, { params });
  const results = (data.data?.children || []).map(mapPost);
  return { results, count: results.length, query: q, after: data.data?.after };
}

async function opVote(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit vote: 'fullname' (t3_xxx / t1_xxx) required.", skipped: true };
  const dir = config.direction === "down" ? -1 : config.direction === "clear" ? 0 : 1;
  await postForm(client, `/api/vote`, { id: config.fullname, dir });
  return { success: true, fullname: config.fullname, direction: dir };
}

async function opSavePost(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit savePost: 'fullname' required.", skipped: true };
  await postForm(client, `/api/save`, { id: config.fullname, category: config.category });
  return { success: true, saved: config.fullname };
}

async function opUnsavePost(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit unsavePost: 'fullname' required.", skipped: true };
  await postForm(client, `/api/unsave`, { id: config.fullname });
  return { success: true, unsaved: config.fullname };
}

async function opHidePost(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit hidePost: 'fullname' required.", skipped: true };
  await postForm(client, `/api/hide`, { id: config.fullname });
  return { success: true, hidden: config.fullname };
}

async function opUnhidePost(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit unhidePost: 'fullname' required.", skipped: true };
  await postForm(client, `/api/unhide`, { id: config.fullname });
  return { success: true, unhidden: config.fullname };
}

async function opEditPost(config, client) {
  if (!config.fullname || !config.text) return { success: false, error: "Reddit editPost: 'fullname' and 'text' required.", skipped: true };
  const data = await postForm(client, `/api/editusertext`, { thing_id: config.fullname, text: config.text, api_type: "json" });
  return { success: !data.json?.errors?.length, thing: data.json?.data?.things?.[0]?.data, errors: data.json?.errors || [] };
}

async function opDeletePost(config, client) {
  if (!config.fullname) return { success: false, error: "Reddit deletePost: 'fullname' required.", skipped: true };
  await postForm(client, `/api/del`, { id: config.fullname });
  return { success: true, deleted: config.fullname };
}

async function opGetDuplicates(config, client) {
  if (!config.postId) return { success: false, error: "Reddit getDuplicates: 'postId' required.", skipped: true };
  const data = await get(client, `/duplicates/${encodeURIComponent(config.postId)}.json`, { params: { limit: boundLimit(config.limit) } });
  const dupes = (data[1]?.data?.children || []).map(mapPost);
  return { duplicates: dupes, count: dupes.length };
}

async function opSetFlair(config, client) {
  if (!config.subreddit || !config.fullname) return { success: false, error: "Reddit setFlair: 'subreddit' and 'fullname' required.", skipped: true };
  const data = await postForm(client, `/r/${encodeURIComponent(config.subreddit)}/api/selectflair`, {
    link: config.fullname,
    flair_template_id: config.flairId,
    text: config.flairText,
    api_type: "json",
  });
  return { success: !data.json?.errors?.length, errors: data.json?.errors || [] };
}

export const postOperations = {
  listPosts: opListPosts,
  getPost: opGetPost,
  submitPost: opSubmitPost,
  search: opSearch,
  vote: opVote,
  savePost: opSavePost,
  unsavePost: opUnsavePost,
  hidePost: opHidePost,
  unhidePost: opUnhidePost,
  editPost: opEditPost,
  deletePost: opDeletePost,
  getDuplicates: opGetDuplicates,
  setFlair: opSetFlair,
};

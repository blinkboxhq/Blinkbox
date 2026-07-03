/**
 * Mastodon — Status resource. Post/delete/get, boost & unboost, favourite &
 * unfavourite, bookmark & unbookmark, pin & unpin, reblog list, favourited-by
 * list, and context (ancestors/descendants). Handlers receive { headers, base }.
 */
import { get, post, del, boundLimit, mapStatus, mapAccount } from "../GenericFunctions.js";

async function opPostStatus(config, client, input) {
  const status = config.status || config.text || input?.text;
  if (!status) return { success: false, error: "mastodon: 'status' text is required.", skipped: true };
  const body = { status: String(status).substring(0, 500), visibility: config.visibility || "public" };
  if (config.inReplyToId || config.replyToId) body.in_reply_to_id = config.inReplyToId || config.replyToId;
  if (config.spoilerText) body.spoiler_text = config.spoilerText;
  if (config.sensitive != null) body.sensitive = config.sensitive === true;
  if (config.language) body.language = config.language;
  if (config.mediaIds) {
    const ids = Array.isArray(config.mediaIds) ? config.mediaIds : String(config.mediaIds).split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) body.media_ids = ids;
  }
  const data = await post(client, `/statuses`, body);
  return { id: data.id, url: data.url, content: data.content, visibility: data.visibility };
}

async function opDeleteStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  await del(client, `/statuses/${id}`);
  return { deleted: true, id };
}

async function opGetStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await get(client, `/statuses/${id}`);
  return mapStatus(data);
}

async function opBoostStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/reblog`);
  return { reblogged: true, id: data.id };
}

async function opUnboostStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/unreblog`);
  return { reblogged: false, id: data.id };
}

async function opFavouriteStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/favourite`);
  return { favourited: true, id: data.id };
}

async function opUnfavouriteStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/unfavourite`);
  return { favourited: false, id: data.id };
}

async function opBookmarkStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/bookmark`);
  return { bookmarked: true, id: data.id };
}

async function opUnbookmarkStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/unbookmark`);
  return { bookmarked: false, id: data.id };
}

async function opPinStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/pin`);
  return { pinned: true, id: data.id };
}

async function opUnpinStatus(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await post(client, `/statuses/${id}/unpin`);
  return { pinned: false, id: data.id };
}

async function opGetStatusContext(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await get(client, `/statuses/${id}/context`);
  return {
    ancestors: (data.ancestors || []).map(mapStatus),
    descendants: (data.descendants || []).map(mapStatus),
  };
}

async function opGetRebloggedBy(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await get(client, `/statuses/${id}/reblogged_by`, { params: { limit: boundLimit(config.limit) } });
  return { accounts: (data || []).map(mapAccount), count: data?.length || 0 };
}

async function opGetFavouritedBy(config, client, input) {
  const id = config.statusId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
  const data = await get(client, `/statuses/${id}/favourited_by`, { params: { limit: boundLimit(config.limit) } });
  return { accounts: (data || []).map(mapAccount), count: data?.length || 0 };
}

export const statusOperations = {
  postStatus: opPostStatus,
  post: opPostStatus,
  deleteStatus: opDeleteStatus,
  getStatus: opGetStatus,
  boostStatus: opBoostStatus,
  unboostStatus: opUnboostStatus,
  favouriteStatus: opFavouriteStatus,
  unfavouriteStatus: opUnfavouriteStatus,
  bookmarkStatus: opBookmarkStatus,
  unbookmarkStatus: opUnbookmarkStatus,
  pinStatus: opPinStatus,
  unpinStatus: opUnpinStatus,
  getStatusContext: opGetStatusContext,
  getRebloggedBy: opGetRebloggedBy,
  getFavouritedBy: opGetFavouritedBy,
};

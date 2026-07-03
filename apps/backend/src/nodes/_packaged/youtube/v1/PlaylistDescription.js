/**
 * YouTube — Playlist & PlaylistItem resources. Playlist CRUD + listing, and
 * playlist-item add/list/update/remove. Handlers receive the raw OAuth token.
 */
import { get, post, put, del, boundResults } from "../GenericFunctions.js";

async function opCreatePlaylist(config, token) {
  if (!config.title) return { success: false, error: "YouTube createPlaylist: 'title' is required.", skipped: true };
  const body = {
    snippet: {
      title: config.title,
      description: config.description || "",
      ...(config.tags ? { tags: String(config.tags).split(",").map((t) => t.trim()).filter(Boolean) } : {}),
      ...(config.language ? { defaultLanguage: config.language } : {}),
    },
    status: { privacyStatus: config.privacy || "private" },
  };
  const data = await post(token, `/playlists`, body, { params: { part: "snippet,status" } });
  return { success: true, ...data };
}

async function opGetPlaylist(config, token) {
  if (!config.playlistId) return { success: false, error: "YouTube getPlaylist: 'playlistId' is required.", skipped: true };
  const data = await get(token, `/playlists`, {
    params: { part: "snippet,contentDetails,status", id: config.playlistId },
  });
  return { success: true, ...data.items?.[0] };
}

async function opListPlaylists(config, token) {
  const params = { part: "snippet,contentDetails", maxResults: boundResults(config.maxResults, 20) };
  if (config.channelId) params.channelId = config.channelId;
  else params.mine = true;
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/playlists`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opUpdatePlaylist(config, token) {
  if (!config.playlistId) return { success: false, error: "YouTube updatePlaylist: 'playlistId' is required.", skipped: true };
  const current = await get(token, `/playlists`, { params: { part: "snippet,status", id: config.playlistId } });
  const existing = current.items?.[0];
  if (!existing) return { success: false, error: `YouTube updatePlaylist: Playlist "${config.playlistId}" not found.`, skipped: true };
  const snippet = { ...existing.snippet };
  if (config.title != null) snippet.title = config.title;
  if (config.description != null) snippet.description = config.description;
  const status = { ...existing.status };
  if (config.privacy != null) status.privacyStatus = config.privacy;
  const data = await put(token, `/playlists`, { id: config.playlistId, snippet, status }, { params: { part: "snippet,status" } });
  return { success: true, ...data };
}

async function opDeletePlaylist(config, token) {
  if (!config.playlistId) return { success: false, error: "YouTube deletePlaylist: 'playlistId' is required.", skipped: true };
  await del(token, `/playlists`, { params: { id: config.playlistId } });
  return { success: true, deleted: config.playlistId };
}

async function opAddPlaylistItem(config, token) {
  if (!config.playlistId || !config.videoId) return { success: false, error: "YouTube addPlaylistItem: 'playlistId' and 'videoId' are required.", skipped: true };
  const snippet = {
    playlistId: config.playlistId,
    resourceId: { kind: "youtube#video", videoId: config.videoId },
  };
  if (config.position != null) snippet.position = Number(config.position);
  const data = await post(token, `/playlistItems`, { snippet }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opListPlaylistItems(config, token) {
  if (!config.playlistId) return { success: false, error: "YouTube listPlaylistItems: 'playlistId' is required.", skipped: true };
  const params = { part: "snippet,contentDetails", playlistId: config.playlistId, maxResults: boundResults(config.maxResults, 20) };
  if (config.pageToken) params.pageToken = config.pageToken;
  const data = await get(token, `/playlistItems`, { params });
  return { success: true, items: data.items, nextPageToken: data.nextPageToken };
}

async function opUpdatePlaylistItem(config, token) {
  if (!config.playlistItemId || !config.playlistId || !config.videoId) {
    return { success: false, error: "YouTube updatePlaylistItem: 'playlistItemId', 'playlistId' and 'videoId' are required.", skipped: true };
  }
  const snippet = {
    playlistId: config.playlistId,
    resourceId: { kind: "youtube#video", videoId: config.videoId },
  };
  if (config.position != null) snippet.position = Number(config.position);
  const data = await put(token, `/playlistItems`, { id: config.playlistItemId, snippet }, { params: { part: "snippet" } });
  return { success: true, ...data };
}

async function opRemovePlaylistItem(config, token) {
  if (!config.playlistItemId) return { success: false, error: "YouTube removePlaylistItem: 'playlistItemId' is required.", skipped: true };
  await del(token, `/playlistItems`, { params: { id: config.playlistItemId } });
  return { success: true, deleted: config.playlistItemId };
}

export const playlistOperations = {
  createPlaylist: opCreatePlaylist,
  getPlaylist: opGetPlaylist,
  listPlaylists: opListPlaylists,
  updatePlaylist: opUpdatePlaylist,
  deletePlaylist: opDeletePlaylist,
  addPlaylistItem: opAddPlaylistItem,
  listPlaylistItems: opListPlaylistItems,
  updatePlaylistItem: opUpdatePlaylistItem,
  removePlaylistItem: opRemovePlaylistItem,
};

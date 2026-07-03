/**
 * Dropbox — Sharing resource. Shared links + shared folders. The original
 * shareFile handler is preserved verbatim in behaviour; list / revoke shared
 * links and share/list/unshare folder ops added for parity. Handlers receive
 * (config, client).
 */
import { dbPath, num, rpc } from "../GenericFunctions.js";

async function opShareFile(config, client) {
  const { path, audience, access } = config;
  if (!path) return { success: false, error: "Dropbox shareFile: 'path' is required.", skipped: true };
  const data = await rpc(client, "/sharing/create_shared_link_with_settings", {
    path: dbPath(path),
    settings: {
      requested_visibility: { ".tag": audience || "public" },
      audience: { ".tag": audience || "public" },
      access: { ".tag": access || "viewer" },
    },
  });
  return { success: true, url: data.url, id: data.id, name: data.name, path: data.path_display };
}

async function opListSharedLinks(config, client) {
  const { path } = config;
  const body = path ? { path: dbPath(path) } : {};
  const data = await rpc(client, "/sharing/list_shared_links", body);
  return {
    success: true,
    count: (data.links ?? []).length,
    hasMore: data.has_more,
    items: (data.links ?? []).map((l) => ({ url: l.url, id: l.id, name: l.name, path: l.path_lower, visibility: l.link_permissions?.resolved_visibility?.[".tag"] })),
  };
}

async function opRevokeSharedLink(config, client) {
  const { url } = config;
  if (!url) return { success: false, error: "Dropbox revokeSharedLink: 'url' is required.", skipped: true };
  await rpc(client, "/sharing/revoke_shared_link", { url });
  return { success: true, revoked: true, url };
}

async function opGetSharedLinkMetadata(config, client) {
  const { url } = config;
  if (!url) return { success: false, error: "Dropbox getSharedLinkMetadata: 'url' is required.", skipped: true };
  const data = await rpc(client, "/sharing/get_shared_link_metadata", { url });
  return { success: true, url: data.url, id: data.id, name: data.name, path: data.path_lower, tag: data[".tag"] };
}

async function opShareFolder(config, client) {
  const { folderPath } = config;
  if (!folderPath) return { success: false, error: "Dropbox shareFolder: 'folderPath' is required.", skipped: true };
  const data = await rpc(client, "/sharing/share_folder", { path: dbPath(folderPath), force_async: false }, 30000);
  const meta = data.complete ?? data;
  return { success: true, sharedFolderId: meta.shared_folder_id, name: meta.name, path: meta.path_lower, tag: data[".tag"] };
}

async function opListSharedFolders(config, client) {
  const { limit } = config;
  const data = await rpc(client, "/sharing/list_folders", { limit: num(limit, 100) });
  return {
    success: true,
    count: (data.entries ?? []).length,
    cursor: data.cursor,
    items: (data.entries ?? []).map((f) => ({ sharedFolderId: f.shared_folder_id, name: f.name, path: f.path_lower, accessType: f.access_type?.[".tag"] })),
  };
}

async function opAddFolderMember(config, client) {
  const { sharedFolderId, email, accessLevel } = config;
  if (!sharedFolderId) return { success: false, error: "Dropbox addFolderMember: 'sharedFolderId' is required.", skipped: true };
  if (!email) return { success: false, error: "Dropbox addFolderMember: 'email' is required.", skipped: true };
  await rpc(client, "/sharing/add_folder_member", {
    shared_folder_id: sharedFolderId,
    members: [{ member: { ".tag": "email", email }, access_level: { ".tag": accessLevel || "viewer" } }],
    quiet: false,
  });
  return { success: true, added: true, sharedFolderId, email };
}

async function opUnshareFolder(config, client) {
  const { sharedFolderId } = config;
  if (!sharedFolderId) return { success: false, error: "Dropbox unshareFolder: 'sharedFolderId' is required.", skipped: true };
  const data = await rpc(client, "/sharing/unshare_folder", { shared_folder_id: sharedFolderId, leave_a_copy: false }, 30000);
  return { success: true, unshared: true, tag: data[".tag"], sharedFolderId };
}

export const sharingOperations = {
  shareFile: opShareFile,
  listSharedLinks: opListSharedLinks,
  revokeSharedLink: opRevokeSharedLink,
  getSharedLinkMetadata: opGetSharedLinkMetadata,
  shareFolder: opShareFolder,
  listSharedFolders: opListSharedFolders,
  addFolderMember: opAddFolderMember,
  unshareFolder: opUnshareFolder,
};

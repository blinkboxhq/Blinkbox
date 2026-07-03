/**
 * Box — Sharing & Search resource. Shared links, search, and collaborations.
 * The original shareFile and searchFiles handlers are preserved verbatim in
 * behaviour; removeSharedLink, addCollaboration, listCollaborations and
 * removeCollaboration added for parity. Handlers receive (config, client).
 */
import { enc, num, itemPath, apiGet, apiPost, apiPut, apiDelete } from "../GenericFunctions.js";

async function opShareFile(config, client) {
  const { fileId, access, password, unsharedAt, itemType } = config;
  if (!fileId) return { success: false, error: "Box shareFile: 'fileId' is required.", skipped: true };
  const sharedLink = { access: access || "open" };
  if (password) sharedLink.password = password;
  if (unsharedAt) sharedLink.unshared_at = unsharedAt;
  const data = await apiPut(client, `/${itemPath(itemType)}/${enc(fileId)}`, { shared_link: sharedLink });
  return {
    success: true,
    url: data.shared_link?.url,
    downloadUrl: data.shared_link?.download_url,
    access: data.shared_link?.access,
    effectiveAccess: data.shared_link?.effective_access,
  };
}

async function opRemoveSharedLink(config, client) {
  const { fileId, itemType } = config;
  if (!fileId) return { success: false, error: "Box removeSharedLink: 'fileId' is required.", skipped: true };
  await apiPut(client, `/${itemPath(itemType)}/${enc(fileId)}`, { shared_link: null });
  return { success: true, removed: true, id: fileId };
}

async function opSearchFiles(config, client) {
  const { query, folderId, limit } = config;
  if (!query) return { success: false, error: "Box searchFiles: 'query' is required.", skipped: true };
  const params = { query, limit: num(limit, 20) };
  if (folderId) params.ancestor_folder_ids = folderId;
  const data = await apiGet(client, "/search", params);
  return {
    success: true,
    count: data.total_count,
    items: data.entries.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      createdAt: f.created_at,
      modifiedAt: f.modified_at,
    })),
  };
}

async function opAddCollaboration(config, client) {
  const { fileId, email, role, itemType } = config;
  if (!fileId) return { success: false, error: "Box addCollaboration: 'fileId' is required.", skipped: true };
  if (!email) return { success: false, error: "Box addCollaboration: 'email' is required.", skipped: true };
  const item = { type: itemType === "folder" ? "folder" : "file", id: fileId };
  const data = await apiPost(client, "/collaborations", {
    item,
    accessible_by: { type: "user", login: email },
    role: role || "viewer",
  });
  return { success: true, id: data.id, role: data.role, status: data.status, email };
}

async function opListCollaborations(config, client) {
  const { fileId, itemType } = config;
  if (!fileId) return { success: false, error: "Box listCollaborations: 'fileId' is required.", skipped: true };
  const data = await apiGet(client, `/${itemPath(itemType)}/${enc(fileId)}/collaborations`);
  return {
    success: true,
    count: (data.entries ?? []).length,
    items: (data.entries ?? []).map((c) => ({ id: c.id, role: c.role, status: c.status, login: c.accessible_by?.login })),
  };
}

async function opRemoveCollaboration(config, client) {
  const { collaborationId } = config;
  if (!collaborationId) return { success: false, error: "Box removeCollaboration: 'collaborationId' is required.", skipped: true };
  await apiDelete(client, `/collaborations/${enc(collaborationId)}`);
  return { success: true, removed: true, id: collaborationId };
}

export const sharingOperations = {
  shareFile: opShareFile,
  removeSharedLink: opRemoveSharedLink,
  searchFiles: opSearchFiles,
  addCollaboration: opAddCollaboration,
  listCollaborations: opListCollaborations,
  removeCollaboration: opRemoveCollaboration,
};

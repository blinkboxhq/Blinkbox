/**
 * GOOGLE DRIVE NODE
 * Manage files, folders, permissions, and trash via Google Drive API v3.
 *
 * Auth: Google OAuth2 access token in vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const FILE_FIELDS = "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,iconLink,parents,trashed,starred,shared,owners(emailAddress)";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Google Drive");
}

function h(token, json = false) {
  const out = { Authorization: `Bearer ${token}` };
  if (json) out["Content-Type"] = "application/json";
  return out;
}

function esc(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function slimFile(f) {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    modifiedTime: f.modifiedTime,
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    parents: f.parents ?? [],
    trashed: f.trashed,
    starred: f.starred,
    shared: f.shared,
    owners: f.owners?.map((o) => o.emailAddress) ?? [],
  };
}

const SUPPORTS_ALL = { supportsAllDrives: true };

/* ----------------------------- FILES ---------------------------- */

async function opListFiles(config, token) {
  const q = [
    config.folderId ? `'${esc(config.folderId)}' in parents` : "'root' in parents",
    config.includeTrashed ? "" : "trashed = false",
    config.mimeType ? `mimeType = '${esc(config.mimeType)}'` : "",
  ].filter(Boolean).join(" and ");
  const res = await axios.get(`${BASE}/files`, {
    headers: h(token), timeout: 15000,
    params: { q, fields: `nextPageToken,files(${FILE_FIELDS})`, pageSize: Math.min(Number(config.limit || 50), 1000), pageToken: config.pageToken || undefined, orderBy: config.orderBy || undefined, ...SUPPORTS_ALL, includeItemsFromAllDrives: true },
  });
  return { files: res.data.files?.map(slimFile) ?? [], count: res.data.files?.length ?? 0, nextPageToken: res.data.nextPageToken };
}

async function opSearch(config, token) {
  if (!config.query) return { success: false, error: "Google Drive search: 'query' is required.", skipped: true };
  const raw = config.fullQuery
    ? config.query
    : `(name contains '${esc(config.query)}'${config.searchContent ? ` or fullText contains '${esc(config.query)}'` : ""}) and trashed = false`;
  const res = await axios.get(`${BASE}/files`, {
    headers: h(token), timeout: 15000,
    params: { q: raw, fields: `nextPageToken,files(${FILE_FIELDS})`, pageSize: Math.min(Number(config.limit || 50), 1000), pageToken: config.pageToken || undefined, ...SUPPORTS_ALL, includeItemsFromAllDrives: true },
  });
  return { files: res.data.files?.map(slimFile) ?? [], count: res.data.files?.length ?? 0, nextPageToken: res.data.nextPageToken };
}

async function opGetFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive getFile: 'fileId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}`, {
    headers: h(token), timeout: 15000,
    params: { fields: FILE_FIELDS, ...SUPPORTS_ALL },
  });
  return slimFile(res.data);
}

async function opCreateFolder(config, token) {
  if (!config.name) return { success: false, error: "Google Drive createFolder: 'name' is required.", skipped: true };
  const res = await axios.post(`${BASE}/files`, {
    name: config.name,
    mimeType: "application/vnd.google-apps.folder",
    parents: config.parentId ? [config.parentId] : undefined,
  }, { headers: h(token, true), timeout: 15000, params: SUPPORTS_ALL });
  return slimFile(res.data);
}

async function opUploadText(config, token) {
  if (!config.name || config.content === undefined) return { success: false, error: "Google Drive uploadText: 'name' and 'content' are required.", skipped: true };
  const mimeType = config.mimeType || "text/plain";
  const metadata = { name: config.name, parents: config.folderId ? [config.folderId] : undefined };
  const formData = `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary\r\nContent-Type: ${mimeType}\r\n\r\n${config.content}\r\n--boundary--`;
  const res = await axios.post(`${UPLOAD_BASE}/files?uploadType=multipart&supportsAllDrives=true`, formData, {
    headers: { ...h(token), "Content-Type": "multipart/related; boundary=boundary" }, timeout: 30000,
  });
  return { id: res.data.id, name: res.data.name };
}

async function opDownloadText(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive downloadText: 'fileId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}?alt=media&supportsAllDrives=true`, { headers: h(token), timeout: 30000, responseType: "text" });
  return { content: res.data, fileId: config.fileId };
}

async function opExportFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive exportFile: 'fileId' is required.", skipped: true };
  if (!config.exportMimeType) return { success: false, error: "Google Drive exportFile: 'exportMimeType' is required (e.g. text/plain, application/pdf).", skipped: true };
  const res = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}/export`, {
    headers: h(token), timeout: 30000, responseType: "text",
    params: { mimeType: config.exportMimeType },
  });
  return { content: res.data, fileId: config.fileId, mimeType: config.exportMimeType };
}

async function opCopyFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive copyFile: 'fileId' is required.", skipped: true };
  const body = { name: config.name || undefined, parents: config.parentId ? [config.parentId] : undefined };
  const res = await axios.post(`${BASE}/files/${encodeURIComponent(config.fileId)}/copy`, body, {
    headers: h(token, true), timeout: 15000, params: { fields: FILE_FIELDS, ...SUPPORTS_ALL },
  });
  return slimFile(res.data);
}

async function opRenameFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive renameFile: 'fileId' is required.", skipped: true };
  if (!config.name) return { success: false, error: "Google Drive renameFile: 'name' is required.", skipped: true };
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { name: config.name }, {
    headers: h(token, true), timeout: 15000, params: { fields: FILE_FIELDS, ...SUPPORTS_ALL },
  });
  return slimFile(res.data);
}

async function opUpdateFileContent(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive updateFileContent: 'fileId' is required.", skipped: true };
  if (config.content === undefined) return { success: false, error: "Google Drive updateFileContent: 'content' is required.", skipped: true };
  const mimeType = config.mimeType || "text/plain";
  const res = await axios.patch(`${UPLOAD_BASE}/files/${encodeURIComponent(config.fileId)}?uploadType=media&supportsAllDrives=true`, config.content, {
    headers: { ...h(token), "Content-Type": mimeType }, timeout: 30000,
  });
  return { id: res.data.id, name: res.data.name, updated: true };
}

async function opMoveFile(config, token) {
  if (!config.fileId || !config.targetFolderId) return { success: false, error: "Google Drive moveFile: 'fileId' and 'targetFolderId' are required.", skipped: true };
  const meta = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { headers: h(token), params: { fields: "parents", ...SUPPORTS_ALL }, timeout: 15000 });
  const oldParents = (meta.data.parents ?? []).join(",");
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}`, {}, { headers: h(token), params: { addParents: config.targetFolderId, removeParents: oldParents, fields: "id,parents", ...SUPPORTS_ALL }, timeout: 15000 });
  return { moved: true, fileId: res.data.id, parents: res.data.parents ?? [] };
}

async function opDeleteFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive deleteFile: 'fileId' is required.", skipped: true };
  await axios.delete(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { headers: h(token), timeout: 15000, params: SUPPORTS_ALL });
  return { deleted: true, fileId: config.fileId };
}

async function opTrashFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive trashFile: 'fileId' is required.", skipped: true };
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { trashed: true }, { headers: h(token, true), timeout: 15000, params: { fields: "id,trashed", ...SUPPORTS_ALL } });
  return { trashed: true, fileId: res.data.id };
}

async function opRestoreFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive restoreFile: 'fileId' is required.", skipped: true };
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { trashed: false }, { headers: h(token, true), timeout: 15000, params: { fields: "id,trashed", ...SUPPORTS_ALL } });
  return { restored: true, fileId: res.data.id };
}

async function opEmptyTrash(config, token) {
  await axios.delete(`${BASE}/files/trash`, { headers: h(token), timeout: 30000 });
  return { trashEmptied: true };
}

async function opStarFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive starFile: 'fileId' is required.", skipped: true };
  const starred = config.starred !== false;
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { starred }, { headers: h(token, true), timeout: 15000, params: { fields: "id,starred", ...SUPPORTS_ALL } });
  return { fileId: res.data.id, starred: res.data.starred };
}

/* -------------------------- PERMISSIONS ------------------------- */

async function opShareFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive shareFile: 'fileId' is required.", skipped: true };
  const type = config.shareType || "user";
  if ((type === "user" || type === "group") && !config.email) {
    return { success: false, error: "Google Drive shareFile: 'email' is required when sharing with a user or group.", skipped: true };
  }
  const body = {
    type,
    role: config.role || "reader",
    emailAddress: type === "user" || type === "group" ? config.email : undefined,
    domain: type === "domain" ? config.domain : undefined,
  };
  const res = await axios.post(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, body, {
    headers: h(token, true), timeout: 15000,
    params: { sendNotificationEmail: config.sendNotificationEmail !== false && (type === "user" || type === "group"), ...SUPPORTS_ALL },
  });
  return { permissionId: res.data.id, role: res.data.role, type: res.data.type, shared: true };
}

async function opCreateSharedLink(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive createSharedLink: 'fileId' is required.", skipped: true };
  await axios.post(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, {
    type: "anyone", role: config.role || "reader",
  }, { headers: h(token, true), timeout: 15000, params: SUPPORTS_ALL });
  const meta = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { headers: h(token), timeout: 15000, params: { fields: "id,name,webViewLink,webContentLink", ...SUPPORTS_ALL } });
  return { fileId: meta.data.id, name: meta.data.name, link: meta.data.webViewLink, downloadLink: meta.data.webContentLink };
}

async function opListPermissions(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive listPermissions: 'fileId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, {
    headers: h(token), timeout: 15000,
    params: { fields: "permissions(id,type,role,emailAddress,domain)", ...SUPPORTS_ALL },
  });
  return { permissions: res.data.permissions ?? [], count: res.data.permissions?.length ?? 0 };
}

async function opUpdatePermission(config, token) {
  if (!config.fileId || !config.permissionId) return { success: false, error: "Google Drive updatePermission: 'fileId' and 'permissionId' are required.", skipped: true };
  if (!config.role) return { success: false, error: "Google Drive updatePermission: 'role' is required.", skipped: true };
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions/${encodeURIComponent(config.permissionId)}`, { role: config.role }, {
    headers: h(token, true), timeout: 15000, params: SUPPORTS_ALL,
  });
  return { permissionId: res.data.id, role: res.data.role, updated: true };
}

async function opRemovePermission(config, token) {
  if (!config.fileId || !config.permissionId) return { success: false, error: "Google Drive removePermission: 'fileId' and 'permissionId' are required.", skipped: true };
  await axios.delete(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions/${encodeURIComponent(config.permissionId)}`, { headers: h(token), timeout: 15000, params: SUPPORTS_ALL });
  return { removed: true, permissionId: config.permissionId };
}

/* ---------------------------- DRIVES ---------------------------- */

async function opListDrives(config, token) {
  const res = await axios.get(`${BASE}/drives`, { headers: h(token), timeout: 15000, params: { pageSize: Math.min(Number(config.limit || 50), 100) } });
  return { drives: res.data.drives?.map((d) => ({ id: d.id, name: d.name })) ?? [], count: res.data.drives?.length ?? 0 };
}

async function opGetAbout(config, token) {
  const res = await axios.get(`${BASE}/about`, { headers: h(token), timeout: 15000, params: { fields: "user(displayName,emailAddress),storageQuota" } });
  return { user: res.data.user, storageQuota: res.data.storageQuota };
}

const OPERATIONS = {
  listFiles: opListFiles,
  search: opSearch,
  getFile: opGetFile,
  createFolder: opCreateFolder,
  uploadText: opUploadText,
  downloadText: opDownloadText,
  exportFile: opExportFile,
  copyFile: opCopyFile,
  renameFile: opRenameFile,
  updateFileContent: opUpdateFileContent,
  moveFile: opMoveFile,
  deleteFile: opDeleteFile,
  trashFile: opTrashFile,
  restoreFile: opRestoreFile,
  emptyTrash: opEmptyTrash,
  starFile: opStarFile,
  shareFile: opShareFile,
  createSharedLink: opCreateSharedLink,
  listPermissions: opListPermissions,
  updatePermission: opUpdatePermission,
  removePermission: opRemovePermission,
  listDrives: opListDrives,
  getAbout: opGetAbout,
};

function handleError(err) {
  if (err.message?.startsWith("Google Drive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) {
    if (msg.includes("storageQuota")) throw new Error("Google Drive: Storage quota exceeded.");
    throw new Error(`Google Drive: Auth failed (${status}) — ${msg}. Re-connect your Google account.`);
  }
  if (status === 404) throw new Error(`Google Drive: File or folder not found — ${msg}.`);
  if (status === 400) throw new Error(`Google Drive: Bad request — ${msg}.`);
  if (status === 429) throw new Error("Google Drive: Rate limit exceeded. Reduce request frequency.");
  if (status >= 500) throw new Error(`Google Drive: Google server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`Google Drive: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listFiles" } = config;

    if (!config.credentialId) return { success: false, error: "Google Drive: No credential selected.", skipped: true };

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `Google Drive: Unknown operation "${operation}".`, skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Google Drive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, token, context);
    } catch (err) {
      handleError(err);
    }
  },
};

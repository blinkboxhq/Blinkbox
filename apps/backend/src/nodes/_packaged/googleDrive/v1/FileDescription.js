/**
 * Google Drive — file operations: list/search/get, folders, upload/download,
 * export, copy/rename/move, content update, delete/trash/restore, star.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, UPLOAD_BASE, FILE_FIELDS, SUPPORTS_ALL, h, esc, slimFile } from "../GenericFunctions.js";

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

export const fileOperations = {
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
};

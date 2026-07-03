/**
 * ONEDRIVE — File resource. uploadFile / downloadFile / deleteFile / moveFile /
 * getFileInfo preserved verbatim from the monolith; copyFile, renameFile and
 * getDownloadUrl added for parity. Handlers receive (config, ctx) where
 * ctx = { token, headers }.
 */
import axios from "axios";
import { GRAPH, itemUrl, encodePath, resolveContent } from "../GenericFunctions.js";

async function opUploadFile(config, ctx) {
  const { token, headers } = ctx;
  const { path, content, overwrite } = config;
  if (!path) return { success: false, error: "OneDrive uploadFile: 'path' is required.", skipped: true };
  if (!content) return { success: false, error: "OneDrive uploadFile: 'content' is required.", skipped: true };

  const conflictBehavior = overwrite ? "replace" : "fail";
  const uploadUrl = `${GRAPH}/me/drive/root:/${encodePath(path)}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
  const fileBuffer = await resolveContent(content);

  const res = await axios.put(uploadUrl, fileBuffer, {
    headers: { Authorization: headers.Authorization, "Content-Type": "application/octet-stream" },
    timeout: 60000,
  });
  return {
    success: true,
    id: res.data.id,
    name: res.data.name,
    size: res.data.size,
    webUrl: res.data.webUrl,
    createdDateTime: res.data.createdDateTime,
  };
}

async function opDownloadFile(config, ctx) {
  const { headers } = ctx;
  const { path } = config;
  if (!path) return { success: false, error: "OneDrive downloadFile: 'path' or item ID is required.", skipped: true };

  const base = itemUrl(path);
  const metaRes = await axios.get(base, { headers, timeout: 15000 });
  const downloadUrl = metaRes.data["@microsoft.graph.downloadUrl"];
  const fileRes = await axios.get(downloadUrl, { responseType: "arraybuffer", timeout: 60000 });
  const base64 = Buffer.from(fileRes.data).toString("base64");

  return {
    success: true,
    id: metaRes.data.id,
    name: metaRes.data.name,
    size: metaRes.data.size,
    mimeType: metaRes.data.file?.mimeType,
    contentBase64: base64,
  };
}

async function opGetDownloadUrl(config, ctx) {
  const { headers } = ctx;
  const { path } = config;
  if (!path) return { success: false, error: "OneDrive getDownloadUrl: 'path' or item ID is required.", skipped: true };
  const res = await axios.get(itemUrl(path), { headers, timeout: 15000 });
  const url = res.data["@microsoft.graph.downloadUrl"];
  if (!url) return { success: false, error: "OneDrive getDownloadUrl: item has no download URL (may be a folder).", skipped: true };
  return { success: true, id: res.data.id, name: res.data.name, downloadUrl: url };
}

async function opDeleteFile(config, ctx) {
  const { headers } = ctx;
  const { path } = config;
  if (!path) return { success: false, error: "OneDrive deleteFile: 'path' or item ID is required.", skipped: true };
  await axios.delete(itemUrl(path), { headers, timeout: 15000 });
  return { success: true, deleted: path };
}

async function opMoveFile(config, ctx) {
  const { headers } = ctx;
  const { sourcePath, destPath, newName } = config;
  if (!sourcePath) return { success: false, error: "OneDrive moveFile: 'sourcePath' is required.", skipped: true };
  if (!destPath) return { success: false, error: "OneDrive moveFile: 'destPath' (destination folder path) is required.", skipped: true };

  const sourceBase = itemUrl(sourcePath);
  const destMetaUrl = `${GRAPH}/me/drive/root:/${encodePath(destPath)}`;
  const destMeta = await axios.get(destMetaUrl, { headers, timeout: 15000 });

  const patchBody = { parentReference: { id: destMeta.data.id } };
  if (newName) patchBody.name = newName;

  const res = await axios.patch(sourceBase, patchBody, { headers, timeout: 20000 });
  return { success: true, id: res.data.id, name: res.data.name, webUrl: res.data.webUrl };
}

async function opCopyFile(config, ctx) {
  const { headers } = ctx;
  const { sourcePath, destPath, newName } = config;
  if (!sourcePath) return { success: false, error: "OneDrive copyFile: 'sourcePath' is required.", skipped: true };
  if (!destPath) return { success: false, error: "OneDrive copyFile: 'destPath' (destination folder path) is required.", skipped: true };

  const destMetaUrl = `${GRAPH}/me/drive/root:/${encodePath(destPath)}`;
  const destMeta = await axios.get(destMetaUrl, { headers, timeout: 15000 });
  const body = { parentReference: { id: destMeta.data.id } };
  if (newName) body.name = newName;

  const res = await axios.post(`${itemUrl(sourcePath)}/copy`, body, { headers, timeout: 20000 });
  return { success: true, accepted: true, monitorUrl: res.headers?.location, source: sourcePath, destPath };
}

async function opRenameFile(config, ctx) {
  const { headers } = ctx;
  const { path, newName } = config;
  if (!path) return { success: false, error: "OneDrive renameFile: 'path' or item ID is required.", skipped: true };
  if (!newName) return { success: false, error: "OneDrive renameFile: 'newName' is required.", skipped: true };
  const res = await axios.patch(itemUrl(path), { name: newName }, { headers, timeout: 15000 });
  return { success: true, id: res.data.id, name: res.data.name, webUrl: res.data.webUrl };
}

async function opGetFileInfo(config, ctx) {
  const { headers } = ctx;
  const { path } = config;
  if (!path) return { success: false, error: "OneDrive getFileInfo: 'path' or item ID is required.", skipped: true };
  const res = await axios.get(itemUrl(path), { headers, timeout: 15000 });
  return {
    success: true,
    id: res.data.id,
    name: res.data.name,
    size: res.data.size,
    webUrl: res.data.webUrl,
    createdDateTime: res.data.createdDateTime,
    lastModifiedDateTime: res.data.lastModifiedDateTime,
    mimeType: res.data.file?.mimeType,
    isFolder: !!res.data.folder,
  };
}

export const fileOperations = {
  uploadFile: opUploadFile,
  downloadFile: opDownloadFile,
  getDownloadUrl: opGetDownloadUrl,
  deleteFile: opDeleteFile,
  moveFile: opMoveFile,
  copyFile: opCopyFile,
  renameFile: opRenameFile,
  getFileInfo: opGetFileInfo,
};

/**
 * SHAREPOINT — File & Folder resource. listFiles / uploadFile / downloadFile /
 * searchFiles / createFolder / deleteFile preserved verbatim from the monolith;
 * getFileMetadata, updateFileContent, copyFile, moveFile added for parity.
 * Handlers receive (config, ctx) where ctx is { headers, siteId, input }.
 */
import axios from "axios";
import { GRAPH } from "../GenericFunctions.js";

async function opListFiles(config, { headers: h, siteId }) {
  if (!siteId) return { success: false, error: "SharePoint listFiles: 'siteId' required.", skipped: true };
  const driveId = config.driveId;
  const base = driveId ? `${GRAPH}/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}` : `${GRAPH}/sites/${encodeURIComponent(siteId)}/drive`;
  const folderId = config.folderId || "root";
  const { data } = await axios.get(`${base}/items/${encodeURIComponent(folderId)}/children`, { headers: h, timeout: 120000 });
  return { files: data.value.map((f) => ({ id: f.id, name: f.name, size: f.size, webUrl: f.webUrl, folder: !!f.folder })), count: data.value.length };
}

async function opUploadFile(config, { headers: h, siteId, input }) {
  if (!siteId) return { success: false, error: "SharePoint uploadFile: 'siteId' required.", skipped: true };
  const fileName = config.fileName || input.fileName || "upload.txt";
  const content = config.content || input.content || "";
  const base = `${GRAPH}/sites/${encodeURIComponent(siteId)}/drive`;
  const { data } = await axios.put(`${base}/root:/${encodeURIComponent(fileName)}:/content`, content, { headers: { ...h, "Content-Type": "text/plain" }, timeout: 120000 });
  return { id: data.id, name: data.name, webUrl: data.webUrl, size: data.size };
}

async function opDownloadFile(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint downloadFile: 'siteId' and 'itemId' required.", skipped: true };
  const { data: meta } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}`, { headers: h, timeout: 120000 });
  const { data: content } = await axios.get(meta["@microsoft.graph.downloadUrl"], { responseType: "text", timeout: 120000 });
  return { content, name: meta.name, size: meta.size };
}

async function opSearchFiles(config, { headers: h, siteId, input }) {
  if (!siteId) return { success: false, error: "SharePoint searchFiles: 'siteId' required.", skipped: true };
  const q = config.query || input.query || "";
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/root/search(q='${encodeURIComponent(q)}')`, { headers: h, timeout: 120000 });
  return { files: data.value.map((f) => ({ id: f.id, name: f.name, size: f.size, webUrl: f.webUrl })), count: data.value.length, query: q };
}

async function opCreateFolder(config, { headers: h, siteId, input }) {
  if (!siteId) return { success: false, error: "SharePoint createFolder: 'siteId' required.", skipped: true };
  const folderName = config.folderName || input.folderName;
  if (!folderName) return { success: false, error: "SharePoint createFolder: 'folderName' required.", skipped: true };
  const { data } = await axios.post(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/root/children`,
    { name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" },
    { headers: h, timeout: 120000 });
  return { id: data.id, name: data.name, webUrl: data.webUrl };
}

async function opDeleteFile(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint deleteFile: 'siteId' and 'itemId' required.", skipped: true };
  await axios.delete(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}`, { headers: h, timeout: 120000 });
  return { deleted: true, itemId };
}

async function opGetFileMetadata(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint getFileMetadata: 'siteId' and 'itemId' required.", skipped: true };
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}`, { headers: h, timeout: 120000 });
  return { id: data.id, name: data.name, size: data.size, webUrl: data.webUrl, folder: !!data.folder, createdDateTime: data.createdDateTime, lastModifiedDateTime: data.lastModifiedDateTime };
}

async function opUpdateFileContent(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint updateFileContent: 'siteId' and 'itemId' required.", skipped: true };
  const content = config.content ?? input.content ?? "";
  const { data } = await axios.put(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}/content`, content, { headers: { ...h, "Content-Type": "text/plain" }, timeout: 120000 });
  return { id: data.id, name: data.name, webUrl: data.webUrl, size: data.size };
}

async function opCopyFile(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint copyFile: 'siteId' and 'itemId' required.", skipped: true };
  const body = {};
  if (config.newName) body.name = config.newName;
  if (config.parentId) body.parentReference = { id: config.parentId };
  const res = await axios.post(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}/copy`, body, { headers: h, timeout: 120000 });
  return { copyStarted: true, itemId, statusUrl: res.headers?.location };
}

async function opMoveFile(config, { headers: h, siteId, input }) {
  const itemId = config.itemId || input.itemId;
  if (!siteId || !itemId) return { success: false, error: "SharePoint moveFile: 'siteId' and 'itemId' required.", skipped: true };
  if (!config.parentId) return { success: false, error: "SharePoint moveFile: 'parentId' required.", skipped: true };
  const body = { parentReference: { id: config.parentId } };
  if (config.newName) body.name = config.newName;
  const { data } = await axios.patch(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(itemId)}`, body, { headers: h, timeout: 120000 });
  return { moved: true, id: data.id, name: data.name, webUrl: data.webUrl };
}

export const fileOperations = {
  listFiles: opListFiles,
  uploadFile: opUploadFile,
  downloadFile: opDownloadFile,
  searchFiles: opSearchFiles,
  createFolder: opCreateFolder,
  deleteFile: opDeleteFile,
  getFileMetadata: opGetFileMetadata,
  updateFileContent: opUpdateFileContent,
  copyFile: opCopyFile,
  moveFile: opMoveFile,
};

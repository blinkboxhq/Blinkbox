/**
 * Box — File resource. Upload / download / delete / move / copy / metadata /
 * update / versions. The original monolith handlers (uploadFile, downloadFile,
 * deleteFile, moveFile, getFileInfo) are preserved verbatim in behaviour; copy,
 * updateFile, uploadFromUrl, listVersions, uploadNewVersion added for parity.
 * Handlers receive (config, client).
 */
import {
  API, enc, num, itemPath, apiGet, apiPut, apiDelete, uploadContent, fetchRemote, mapItem,
} from "../GenericFunctions.js";
import axios from "axios";

async function opUploadFile(config, client) {
  const { fileName, folderId, content } = config;
  if (!fileName) return { success: false, error: "Box uploadFile: 'fileName' is required.", skipped: true };
  if (content === undefined || content === null || content === "") {
    return { success: false, error: "Box uploadFile: 'content' (base64) is required.", skipped: true };
  }
  const parentId = folderId || "0";
  const fileBuffer = Buffer.from(content, "base64");
  const data = await uploadContent(client, fileBuffer, { name: fileName, parent: { id: parentId } }, fileName);
  const entry = data.entries?.[0] ?? {};
  return {
    success: true,
    id: entry.id,
    name: entry.name,
    size: entry.size,
    createdAt: entry.created_at,
    modifiedAt: entry.modified_at,
  };
}

async function opUploadFromUrl(config, client) {
  const { fileName, folderId, url } = config;
  if (!fileName) return { success: false, error: "Box uploadFromUrl: 'fileName' is required.", skipped: true };
  if (!url) return { success: false, error: "Box uploadFromUrl: 'url' is required.", skipped: true };
  const buffer = await fetchRemote(url);
  const data = await uploadContent(client, buffer, { name: fileName, parent: { id: folderId || "0" } }, fileName);
  const entry = data.entries?.[0] ?? {};
  return { success: true, id: entry.id, name: entry.name, size: entry.size, createdAt: entry.created_at };
}

async function opUploadNewVersion(config, client) {
  const { fileId, content, fileName } = config;
  if (!fileId) return { success: false, error: "Box uploadNewVersion: 'fileId' is required.", skipped: true };
  if (content === undefined || content === null || content === "") {
    return { success: false, error: "Box uploadNewVersion: 'content' (base64) is required.", skipped: true };
  }
  const buffer = Buffer.from(content, "base64");
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("attributes", JSON.stringify(fileName ? { name: fileName } : {}));
  form.append("file", buffer, { filename: fileName || "file" });
  const res = await axios.post(`https://upload.box.com/api/2.0/files/${enc(fileId)}/content`, form, {
    headers: { Authorization: `Bearer ${client.token}`, ...form.getHeaders() },
    timeout: 120000, maxContentLength: Infinity, maxBodyLength: Infinity,
  });
  const entry = res.data.entries?.[0] ?? {};
  return { success: true, id: entry.id, name: entry.name, size: entry.size, modifiedAt: entry.modified_at };
}

async function opDownloadFile(config, client) {
  const { fileId } = config;
  if (!fileId) return { success: false, error: "Box downloadFile: 'fileId' is required.", skipped: true };
  const meta = await apiGet(client, `/files/${enc(fileId)}`);
  const dlRes = await axios.get(`${API}/files/${enc(fileId)}/content`, {
    headers: { Authorization: `Bearer ${client.token}` },
    responseType: "arraybuffer",
    timeout: 120000,
    maxRedirects: 5,
  });
  return {
    success: true,
    id: meta.id,
    name: meta.name,
    size: meta.size,
    mimeType: meta.extension,
    contentBase64: Buffer.from(dlRes.data).toString("base64"),
  };
}

async function opDeleteFile(config, client) {
  const { fileId, itemType } = config;
  if (!fileId) return { success: false, error: "Box deleteFile: 'fileId' is required.", skipped: true };
  await apiDelete(client, `/${itemPath(itemType)}/${enc(fileId)}`);
  return { success: true, deleted: fileId };
}

async function opMoveFile(config, client) {
  const { fileId, destFolderId, newName, itemType } = config;
  if (!fileId) return { success: false, error: "Box moveFile: 'fileId' is required.", skipped: true };
  if (!destFolderId) return { success: false, error: "Box moveFile: 'destFolderId' is required.", skipped: true };
  const body = { parent: { id: destFolderId } };
  if (newName) body.name = newName;
  const data = await apiPut(client, `/${itemPath(itemType)}/${enc(fileId)}`, body);
  return { success: true, id: data.id, name: data.name, modifiedAt: data.modified_at };
}

async function opCopyFile(config, client) {
  const { fileId, destFolderId, newName, itemType } = config;
  if (!fileId) return { success: false, error: "Box copyFile: 'fileId' is required.", skipped: true };
  if (!destFolderId) return { success: false, error: "Box copyFile: 'destFolderId' is required.", skipped: true };
  const body = { parent: { id: destFolderId } };
  if (newName) body.name = newName;
  const res = await axios.post(`${API}/${itemPath(itemType)}/${enc(fileId)}/copy`, body, { headers: client.headers, timeout: 120000 });
  return { success: true, id: res.data.id, name: res.data.name, createdAt: res.data.created_at };
}

async function opUpdateFile(config, client) {
  const { fileId, newName, description, itemType } = config;
  if (!fileId) return { success: false, error: "Box updateFile: 'fileId' is required.", skipped: true };
  const body = {};
  if (newName) body.name = newName;
  if (description !== undefined) body.description = description;
  const data = await apiPut(client, `/${itemPath(itemType)}/${enc(fileId)}`, body);
  return { success: true, id: data.id, name: data.name, description: data.description, modifiedAt: data.modified_at };
}

async function opGetFileInfo(config, client) {
  const { fileId, itemType } = config;
  if (!fileId) return { success: false, error: "Box getFileInfo: 'fileId' is required.", skipped: true };
  const data = await apiGet(client, `/${itemPath(itemType)}/${enc(fileId)}`);
  return {
    success: true,
    id: data.id,
    name: data.name,
    type: data.type,
    size: data.size,
    createdAt: data.created_at,
    modifiedAt: data.modified_at,
    sharedLink: data.shared_link?.url ?? null,
    parentId: data.parent?.id,
  };
}

async function opListVersions(config, client) {
  const { fileId, limit } = config;
  if (!fileId) return { success: false, error: "Box listVersions: 'fileId' is required.", skipped: true };
  const data = await apiGet(client, `/files/${enc(fileId)}/versions`, { limit: num(limit, 100) });
  return {
    success: true,
    count: data.total_count,
    items: (data.entries ?? []).map((v) => ({ id: v.id, name: v.name, size: v.size, modifiedAt: v.modified_at })),
  };
}

export const fileOperations = {
  uploadFile: opUploadFile,
  uploadFromUrl: opUploadFromUrl,
  uploadNewVersion: opUploadNewVersion,
  downloadFile: opDownloadFile,
  deleteFile: opDeleteFile,
  moveFile: opMoveFile,
  copyFile: opCopyFile,
  updateFile: opUpdateFile,
  getFileInfo: opGetFileInfo,
  listVersions: opListVersions,
};

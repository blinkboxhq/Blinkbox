/**
 * Dropbox — File resource. Upload / download / delete / move / copy / metadata /
 * search / restore / revisions / temporary links / thumbnails. The original
 * monolith handlers (uploadFile, downloadFile, deleteFile, moveFile,
 * getFileInfo, searchFiles) are preserved verbatim in behaviour; copy, restore,
 * revisions, tempLink, saveUrl and thumbnail are added for Dropbox v2 parity.
 * Handlers receive (config, client).
 */
import {
  dbPath, num, rpc, contentDownload, contentUpload, fetchRemote, mapEntry,
} from "../GenericFunctions.js";

async function opUploadFile(config, client) {
  const { path, content, overwrite } = config;
  if (!path) return { success: false, error: "Dropbox uploadFile: 'path' is required.", skipped: true };
  if (content === undefined || content === null || content === "") {
    return { success: false, error: "Dropbox uploadFile: 'content' is required.", skipped: true };
  }
  const dropboxPath = dbPath(path);
  const mode = overwrite ? "overwrite" : "add";
  const fileBuffer = Buffer.from(content, "base64");
  const data = await contentUpload(
    client, "/files/upload",
    { path: dropboxPath, mode, autorename: !overwrite },
    fileBuffer,
  );
  return {
    success: true,
    id: data.id,
    name: data.name,
    path: data.path_display,
    size: data.size,
    rev: data.rev,
    clientModified: data.client_modified,
    serverModified: data.server_modified,
  };
}

async function opUploadFromUrl(config, client) {
  const { path, url, overwrite } = config;
  if (!path) return { success: false, error: "Dropbox uploadFromUrl: 'path' is required.", skipped: true };
  if (!url) return { success: false, error: "Dropbox uploadFromUrl: 'url' is required.", skipped: true };
  const buffer = await fetchRemote(url);
  const data = await contentUpload(
    client, "/files/upload",
    { path: dbPath(path), mode: overwrite ? "overwrite" : "add", autorename: !overwrite },
    buffer,
  );
  return { success: true, id: data.id, name: data.name, path: data.path_display, size: data.size, rev: data.rev };
}

async function opDownloadFile(config, client) {
  const { path } = config;
  if (!path) return { success: false, error: "Dropbox downloadFile: 'path' is required.", skipped: true };
  const { data, meta } = await contentDownload(client, "/files/download", { path: dbPath(path) });
  return {
    success: true,
    id: meta.id,
    name: meta.name,
    path: meta.path_display,
    size: meta.size,
    rev: meta.rev,
    contentBase64: data.toString("base64"),
  };
}

async function opDeleteFile(config, client) {
  const { path } = config;
  if (!path) return { success: false, error: "Dropbox deleteFile: 'path' is required.", skipped: true };
  const data = await rpc(client, "/files/delete_v2", { path: dbPath(path) });
  return { success: true, deleted: data.metadata?.path_display ?? path };
}

async function opMoveFile(config, client) {
  const { sourcePath, destPath } = config;
  if (!sourcePath) return { success: false, error: "Dropbox moveFile: 'sourcePath' is required.", skipped: true };
  if (!destPath) return { success: false, error: "Dropbox moveFile: 'destPath' is required.", skipped: true };
  const data = await rpc(client, "/files/move_v2", { from_path: dbPath(sourcePath), to_path: dbPath(destPath), autorename: false }, 20000);
  return { success: true, id: data.metadata?.id, name: data.metadata?.name, path: data.metadata?.path_display };
}

async function opCopyFile(config, client) {
  const { sourcePath, destPath } = config;
  if (!sourcePath) return { success: false, error: "Dropbox copyFile: 'sourcePath' is required.", skipped: true };
  if (!destPath) return { success: false, error: "Dropbox copyFile: 'destPath' is required.", skipped: true };
  const data = await rpc(client, "/files/copy_v2", { from_path: dbPath(sourcePath), to_path: dbPath(destPath), autorename: false }, 20000);
  return { success: true, id: data.metadata?.id, name: data.metadata?.name, path: data.metadata?.path_display };
}

async function opGetFileInfo(config, client) {
  const { path } = config;
  if (!path) return { success: false, error: "Dropbox getFileInfo: 'path' is required.", skipped: true };
  const data = await rpc(client, "/files/get_metadata", { path: dbPath(path) });
  return {
    success: true,
    id: data.id,
    name: data.name,
    path: data.path_display,
    tag: data[".tag"],
    size: data.size,
    rev: data.rev,
    clientModified: data.client_modified,
    serverModified: data.server_modified,
  };
}

async function opSearchFiles(config, client) {
  const { query, folderPath, limit } = config;
  if (!query) return { success: false, error: "Dropbox searchFiles: 'query' is required.", skipped: true };
  const body = {
    query,
    options: {
      path: folderPath ? dbPath(folderPath) : undefined,
      max_results: num(limit, 20),
    },
  };
  const data = await rpc(client, "/files/search_v2", body);
  return {
    success: true,
    count: data.matches.length,
    hasMore: data.has_more,
    items: data.matches.map((m) => ({
      id: m.metadata?.metadata?.id,
      name: m.metadata?.metadata?.name,
      path: m.metadata?.metadata?.path_display,
      tag: m.metadata?.metadata?.[".tag"],
      size: m.metadata?.metadata?.size,
    })),
  };
}

async function opListRevisions(config, client) {
  const { path, limit } = config;
  if (!path) return { success: false, error: "Dropbox listRevisions: 'path' is required.", skipped: true };
  const data = await rpc(client, "/files/list_revisions", { path: dbPath(path), mode: { ".tag": "path" }, limit: num(limit, 10) });
  return {
    success: true,
    isDeleted: data.is_deleted,
    count: (data.entries ?? []).length,
    items: (data.entries ?? []).map(mapEntry),
  };
}

async function opRestoreFile(config, client) {
  const { path, rev } = config;
  if (!path) return { success: false, error: "Dropbox restoreFile: 'path' is required.", skipped: true };
  if (!rev) return { success: false, error: "Dropbox restoreFile: 'rev' is required.", skipped: true };
  const data = await rpc(client, "/files/restore", { path: dbPath(path), rev });
  return { success: true, id: data.id, name: data.name, path: data.path_display, rev: data.rev };
}

async function opGetTemporaryLink(config, client) {
  const { path } = config;
  if (!path) return { success: false, error: "Dropbox getTemporaryLink: 'path' is required.", skipped: true };
  const data = await rpc(client, "/files/get_temporary_link", { path: dbPath(path) });
  return { success: true, link: data.link, name: data.metadata?.name, path: data.metadata?.path_display, size: data.metadata?.size };
}

async function opGetThumbnail(config, client) {
  const { path, size, format } = config;
  if (!path) return { success: false, error: "Dropbox getThumbnail: 'path' is required.", skipped: true };
  const arg = {
    resource: { ".tag": "path", path: dbPath(path) },
    format: { ".tag": format || "jpeg" },
    size: { ".tag": size || "w256h256" },
    mode: { ".tag": "strict" },
  };
  const { data, meta } = await contentDownload(client, "/files/get_thumbnail_v2", arg);
  return { success: true, name: meta.name, path: meta.path_display, thumbnailBase64: data.toString("base64") };
}

export const fileOperations = {
  uploadFile: opUploadFile,
  uploadFromUrl: opUploadFromUrl,
  downloadFile: opDownloadFile,
  deleteFile: opDeleteFile,
  moveFile: opMoveFile,
  copyFile: opCopyFile,
  getFileInfo: opGetFileInfo,
  searchFiles: opSearchFiles,
  listRevisions: opListRevisions,
  restoreFile: opRestoreFile,
  getTemporaryLink: opGetTemporaryLink,
  getThumbnail: opGetThumbnail,
};

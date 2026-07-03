/**
 * Dropbox — Folder resource. List / create / delete-folder / list-continue /
 * batch-create. The original listFiles and createFolder handlers are preserved
 * verbatim in behaviour; continue, batchCreate and getFolderMetadata added for
 * parity. Handlers receive (config, client).
 */
import { dbPath, num, rpc, mapEntry } from "../GenericFunctions.js";

async function opListFiles(config, client) {
  const { folderPath, recursive, limit } = config;
  const dropboxPath = folderPath ? dbPath(folderPath) : "";
  const data = await rpc(client, "/files/list_folder", {
    path: dropboxPath,
    recursive: !!recursive,
    limit: num(limit, 100),
  });
  return {
    success: true,
    count: data.entries.length,
    hasMore: data.has_more,
    cursor: data.cursor,
    items: data.entries.map(mapEntry),
  };
}

async function opListFilesContinue(config, client) {
  const { cursor } = config;
  if (!cursor) return { success: false, error: "Dropbox listFilesContinue: 'cursor' is required.", skipped: true };
  const data = await rpc(client, "/files/list_folder/continue", { cursor });
  return {
    success: true,
    count: data.entries.length,
    hasMore: data.has_more,
    cursor: data.cursor,
    items: data.entries.map(mapEntry),
  };
}

async function opCreateFolder(config, client) {
  const { folderPath } = config;
  if (!folderPath) return { success: false, error: "Dropbox createFolder: 'folderPath' is required.", skipped: true };
  const data = await rpc(client, "/files/create_folder_v2", { path: dbPath(folderPath), autorename: false });
  return {
    success: true,
    id: data.metadata?.id,
    name: data.metadata?.name,
    path: data.metadata?.path_display,
  };
}

async function opBatchCreateFolders(config, client) {
  const { folderPaths } = config;
  const list = Array.isArray(folderPaths)
    ? folderPaths
    : String(folderPaths || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { success: false, error: "Dropbox batchCreateFolders: 'folderPaths' is required.", skipped: true };
  const data = await rpc(client, "/files/create_folder_batch", { paths: list.map(dbPath), autorename: false, force_async: false }, 30000);
  const entries = data.entries ?? [];
  return {
    success: true,
    count: entries.length,
    items: entries.map((e) => ({
      tag: e[".tag"],
      id: e.metadata?.id,
      path: e.metadata?.path_display,
    })),
  };
}

async function opDeleteFolder(config, client) {
  const { folderPath } = config;
  if (!folderPath) return { success: false, error: "Dropbox deleteFolder: 'folderPath' is required.", skipped: true };
  const data = await rpc(client, "/files/delete_v2", { path: dbPath(folderPath) });
  return { success: true, deleted: data.metadata?.path_display ?? folderPath };
}

async function opGetFolderMetadata(config, client) {
  const { folderPath } = config;
  if (!folderPath) return { success: false, error: "Dropbox getFolderMetadata: 'folderPath' is required.", skipped: true };
  const data = await rpc(client, "/files/get_metadata", { path: dbPath(folderPath) });
  return { success: true, id: data.id, name: data.name, path: data.path_display, tag: data[".tag"] };
}

export const folderOperations = {
  listFiles: opListFiles,
  listFilesContinue: opListFilesContinue,
  createFolder: opCreateFolder,
  batchCreateFolders: opBatchCreateFolders,
  deleteFolder: opDeleteFolder,
  getFolderMetadata: opGetFolderMetadata,
};

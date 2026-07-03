/**
 * Box — Folder resource. List items / create / delete-folder / update / copy /
 * get metadata. The original listFiles and createFolder handlers are preserved
 * verbatim in behaviour; deleteFolder, updateFolder, copyFolder and
 * getFolderInfo added for parity. Handlers receive (config, client).
 */
import { API, enc, num, apiGet, apiPost, apiPut } from "../GenericFunctions.js";
import axios from "axios";

async function opListFiles(config, client) {
  const { folderId, limit } = config;
  const id = folderId || "0";
  const data = await apiGet(client, `/folders/${enc(id)}/items`, {
    limit: num(limit, 100),
    fields: "id,name,type,size,created_at,modified_at,content_modified_at",
  });
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

async function opCreateFolder(config, client) {
  const { folderName, parentFolderId } = config;
  if (!folderName) return { success: false, error: "Box createFolder: 'folderName' is required.", skipped: true };
  const data = await apiPost(client, "/folders", { name: folderName, parent: { id: parentFolderId || "0" } });
  return { success: true, id: data.id, name: data.name, createdAt: data.created_at };
}

async function opDeleteFolder(config, client) {
  const { folderId, recursive } = config;
  if (!folderId) return { success: false, error: "Box deleteFolder: 'folderId' is required.", skipped: true };
  const res = await axios.delete(`${API}/folders/${enc(folderId)}`, {
    headers: client.headers,
    params: { recursive: recursive === undefined ? true : !!recursive },
    timeout: 20000,
  });
  return { success: true, deleted: folderId, status: res.status };
}

async function opUpdateFolder(config, client) {
  const { folderId, newName, description } = config;
  if (!folderId) return { success: false, error: "Box updateFolder: 'folderId' is required.", skipped: true };
  const body = {};
  if (newName) body.name = newName;
  if (description !== undefined) body.description = description;
  const data = await apiPut(client, `/folders/${enc(folderId)}`, body);
  return { success: true, id: data.id, name: data.name, description: data.description, modifiedAt: data.modified_at };
}

async function opCopyFolder(config, client) {
  const { folderId, destFolderId, newName } = config;
  if (!folderId) return { success: false, error: "Box copyFolder: 'folderId' is required.", skipped: true };
  if (!destFolderId) return { success: false, error: "Box copyFolder: 'destFolderId' is required.", skipped: true };
  const body = { parent: { id: destFolderId } };
  if (newName) body.name = newName;
  const data = await apiPost(client, `/folders/${enc(folderId)}/copy`, body);
  return { success: true, id: data.id, name: data.name, createdAt: data.created_at };
}

async function opGetFolderInfo(config, client) {
  const { folderId } = config;
  if (!folderId) return { success: false, error: "Box getFolderInfo: 'folderId' is required.", skipped: true };
  const data = await apiGet(client, `/folders/${enc(folderId)}`);
  return {
    success: true,
    id: data.id,
    name: data.name,
    itemCount: data.item_collection?.total_count,
    createdAt: data.created_at,
    modifiedAt: data.modified_at,
    parentId: data.parent?.id,
  };
}

export const folderOperations = {
  listFiles: opListFiles,
  createFolder: opCreateFolder,
  deleteFolder: opDeleteFolder,
  updateFolder: opUpdateFolder,
  copyFolder: opCopyFolder,
  getFolderInfo: opGetFolderInfo,
};

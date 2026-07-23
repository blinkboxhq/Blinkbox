/**
 * ONEDRIVE — Folder resource. listFiles / createFolder preserved verbatim
 * from the monolith; listChildren (by folder ID), search and getStorageQuota
 * added for parity. Handlers receive (config, ctx) where ctx = { token, headers }.
 */
import axios from "axios";
import { GRAPH, childrenUrl, mapItem, num } from "../GenericFunctions.js";

async function opListFiles(config, ctx) {
  const { headers } = ctx;
  const url = childrenUrl(config.folderPath);
  const res = await axios.get(url, { headers, params: { $top: num(config.limit, 100) }, timeout: 120000 });
  return { success: true, count: res.data.value.length, items: res.data.value.map(mapItem) };
}

async function opListChildren(config, ctx) {
  const { headers } = ctx;
  const { folderId } = config;
  if (!folderId) return { success: false, error: "OneDrive listChildren: 'folderId' is required.", skipped: true };
  const res = await axios.get(`${GRAPH}/me/drive/items/${folderId}/children`, {
    headers, params: { $top: num(config.limit, 100) }, timeout: 120000,
  });
  return { success: true, count: res.data.value.length, items: res.data.value.map(mapItem) };
}

async function opCreateFolder(config, ctx) {
  const { headers } = ctx;
  const { folderPath } = config;
  if (!folderPath) return { success: false, error: "OneDrive createFolder: 'folderPath' is required.", skipped: true };

  const parts = folderPath.replace(/^\//, "").split("/");
  const folderName = parts.pop();
  const parentPath = parts.join("/");
  const parentUrl = childrenUrl(parentPath);

  const res = await axios.post(
    parentUrl,
    { name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" },
    { headers, timeout: 120000 }
  );
  return { success: true, id: res.data.id, name: res.data.name, webUrl: res.data.webUrl, createdDateTime: res.data.createdDateTime };
}

async function opSearch(config, ctx) {
  const { headers } = ctx;
  const { query } = config;
  if (!query) return { success: false, error: "OneDrive search: 'query' is required.", skipped: true };
  const url = `${GRAPH}/me/drive/root/search(q='${encodeURIComponent(query)}')`;
  const res = await axios.get(url, { headers, params: { $top: num(config.limit, 50) }, timeout: 120000 });
  return { success: true, count: res.data.value.length, items: res.data.value.map(mapItem) };
}

async function opGetStorageQuota(_config, ctx) {
  const { headers } = ctx;
  const res = await axios.get(`${GRAPH}/me/drive`, { headers, timeout: 120000 });
  const q = res.data.quota || {};
  return {
    success: true,
    total: q.total,
    used: q.used,
    remaining: q.remaining,
    deleted: q.deleted,
    state: q.state,
    driveType: res.data.driveType,
  };
}

export const folderOperations = {
  listFiles: opListFiles,
  listChildren: opListChildren,
  createFolder: opCreateFolder,
  search: opSearch,
  getStorageQuota: opGetStorageQuota,
};

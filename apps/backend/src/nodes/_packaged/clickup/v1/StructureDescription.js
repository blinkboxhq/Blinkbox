/**
 * ClickUp — Space / Folder / List structure resources. Full CRUD for each
 * level of the ClickUp workspace hierarchy plus folderless lists.
 */
import { req, parseDueDate } from "../GenericFunctions.js";

/* ---- Space ---- */
async function opListSpaces(config, client) {
  const params = {};
  if (config.archived != null) params.archived = config.archived;
  const data = await req(client, "GET", `/team/${config.teamId}/space`, { params });
  return { success: true, spaces: data.spaces || [] };
}

async function opGetSpace(config, client) {
  const data = await req(client, "GET", `/space/${config.spaceId}`);
  return { success: true, space: data };
}

function buildSpaceBody(config) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.multipleAssignees != null) body.multiple_assignees = config.multipleAssignees;
  if (config.features) {
    try { body.features = typeof config.features === "string" ? JSON.parse(config.features) : config.features; } catch { /* ignore */ }
  }
  return body;
}

async function opCreateSpace(config, client) {
  const body = buildSpaceBody(config);
  if (!body.name) throw new Error("ClickUp: Space name is required.");
  const data = await req(client, "POST", `/team/${config.teamId}/space`, { body });
  return { success: true, space: data };
}

async function opUpdateSpace(config, client) {
  const data = await req(client, "PUT", `/space/${config.spaceId}`, { body: buildSpaceBody(config) });
  return { success: true, space: data };
}

async function opDeleteSpace(config, client) {
  await req(client, "DELETE", `/space/${config.spaceId}`);
  return { success: true, deleted: true, spaceId: config.spaceId };
}

/* ---- Folder ---- */
async function opListFolders(config, client) {
  const params = {};
  if (config.archived != null) params.archived = config.archived;
  const data = await req(client, "GET", `/space/${config.spaceId}/folder`, { params });
  return { success: true, folders: data.folders || [] };
}

async function opGetFolder(config, client) {
  const data = await req(client, "GET", `/folder/${config.folderId}`);
  return { success: true, folder: data };
}

async function opCreateFolder(config, client) {
  if (!config.name) throw new Error("ClickUp: Folder name is required.");
  const data = await req(client, "POST", `/space/${config.spaceId}/folder`, { body: { name: config.name } });
  return { success: true, folder: data };
}

async function opUpdateFolder(config, client) {
  const data = await req(client, "PUT", `/folder/${config.folderId}`, { body: { name: config.name } });
  return { success: true, folder: data };
}

async function opDeleteFolder(config, client) {
  await req(client, "DELETE", `/folder/${config.folderId}`);
  return { success: true, deleted: true, folderId: config.folderId };
}

/* ---- List ---- */
async function opListLists(config, client) {
  const params = {};
  if (config.archived != null) params.archived = config.archived;
  const data = await req(client, "GET", `/folder/${config.folderId}/list`, { params });
  return { success: true, lists: data.lists || [] };
}

async function opGetList(config, client) {
  const data = await req(client, "GET", `/list/${config.listId}`);
  return { success: true, list: data };
}

function buildListBody(config) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.content != null) body.content = config.content;
  const due = parseDueDate(config.dueDate);
  if (due !== undefined) body.due_date = due;
  if (config.priority != null && config.priority !== "") body.priority = Number(config.priority);
  if (config.assignee) body.assignee = Number(config.assignee);
  if (config.status) body.status = config.status;
  return body;
}

async function opCreateList(config, client) {
  const body = buildListBody(config);
  if (!body.name) throw new Error("ClickUp: List name is required.");
  const data = await req(client, "POST", `/folder/${config.folderId}/list`, { body });
  return { success: true, list: data };
}

async function opCreateFolderlessList(config, client) {
  const body = buildListBody(config);
  if (!body.name) throw new Error("ClickUp: List name is required.");
  const data = await req(client, "POST", `/space/${config.spaceId}/list`, { body });
  return { success: true, list: data };
}

async function opUpdateList(config, client) {
  const data = await req(client, "PUT", `/list/${config.listId}`, { body: buildListBody(config) });
  return { success: true, list: data };
}

async function opDeleteList(config, client) {
  await req(client, "DELETE", `/list/${config.listId}`);
  return { success: true, deleted: true, listId: config.listId };
}

export const structureOperations = {
  listSpaces: opListSpaces,
  getSpace: opGetSpace,
  createSpace: opCreateSpace,
  updateSpace: opUpdateSpace,
  deleteSpace: opDeleteSpace,
  listFolders: opListFolders,
  getFolder: opGetFolder,
  createFolder: opCreateFolder,
  updateFolder: opUpdateFolder,
  deleteFolder: opDeleteFolder,
  listLists: opListLists,
  getList: opGetList,
  createList: opCreateList,
  createFolderlessList: opCreateFolderlessList,
  updateList: opUpdateList,
  deleteList: opDeleteList,
};

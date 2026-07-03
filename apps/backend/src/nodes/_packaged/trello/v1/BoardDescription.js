/**
 * Trello — Board & List resources. Board CRUD + members/labels, and list
 * management.
 */
import { req } from "../GenericFunctions.js";

/* ---- Board ---- */
async function opListBoards(config, client) {
  const data = await req(client, "GET", `/members/me/boards`, { params: { fields: config.fields || "id,name,url,shortUrl,closed,desc,idOrganization" } });
  return { success: true, boards: data, count: data.length };
}

async function opGetBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Trello getBoard: 'boardId' is required.", skipped: true };
  const data = await req(client, "GET", `/boards/${encodeURIComponent(config.boardId)}`);
  return { success: true, board: data };
}

async function opCreateBoard(config, client) {
  if (!config.name) return { success: false, error: "Trello createBoard: 'name' is required.", skipped: true };
  const params = { name: config.name };
  if (config.desc) params.desc = config.desc;
  if (config.idOrganization) params.idOrganization = config.idOrganization;
  if (config.defaultLists != null) params.defaultLists = config.defaultLists;
  const data = await req(client, "POST", `/boards`, { params });
  return { success: true, board: data };
}

async function opUpdateBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Trello updateBoard: 'boardId' is required.", skipped: true };
  const params = {};
  if (config.name != null) params.name = config.name;
  if (config.desc !== undefined) params.desc = config.desc;
  if (config.closed != null) params.closed = config.closed;
  const data = await req(client, "PUT", `/boards/${encodeURIComponent(config.boardId)}`, { params });
  return { success: true, board: data };
}

async function opDeleteBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Trello deleteBoard: 'boardId' is required.", skipped: true };
  await req(client, "DELETE", `/boards/${encodeURIComponent(config.boardId)}`);
  return { success: true, deleted: true, id: config.boardId };
}

async function opListBoardMembers(config, client) {
  if (!config.boardId) return { success: false, error: "Trello listBoardMembers: 'boardId' is required.", skipped: true };
  const data = await req(client, "GET", `/boards/${encodeURIComponent(config.boardId)}/members`);
  return { success: true, members: data };
}

async function opListBoardLabels(config, client) {
  if (!config.boardId) return { success: false, error: "Trello listBoardLabels: 'boardId' is required.", skipped: true };
  const data = await req(client, "GET", `/boards/${encodeURIComponent(config.boardId)}/labels`);
  return { success: true, labels: data };
}

/* ---- List ---- */
async function opListLists(config, client) {
  if (!config.boardId) return { success: false, error: "Trello listLists: 'boardId' is required.", skipped: true };
  const data = await req(client, "GET", `/boards/${encodeURIComponent(config.boardId)}/lists`);
  return { success: true, lists: data, count: data.length };
}

async function opGetList(config, client) {
  if (!config.listId) return { success: false, error: "Trello getList: 'listId' is required.", skipped: true };
  const data = await req(client, "GET", `/lists/${encodeURIComponent(config.listId)}`);
  return { success: true, list: data };
}

async function opCreateList(config, client) {
  if (!config.boardId || !config.name) return { success: false, error: "Trello createList: 'boardId' and 'name' are required.", skipped: true };
  const params = { idBoard: config.boardId, name: config.name };
  if (config.position) params.pos = config.position;
  const data = await req(client, "POST", `/lists`, { params });
  return { success: true, list: data };
}

async function opUpdateList(config, client) {
  if (!config.listId) return { success: false, error: "Trello updateList: 'listId' is required.", skipped: true };
  const params = {};
  if (config.name != null) params.name = config.name;
  if (config.position) params.pos = config.position;
  if (config.closed != null) params.closed = config.closed;
  const data = await req(client, "PUT", `/lists/${encodeURIComponent(config.listId)}`, { params });
  return { success: true, list: data };
}

async function opArchiveList(config, client) {
  if (!config.listId) return { success: false, error: "Trello archiveList: 'listId' is required.", skipped: true };
  const data = await req(client, "PUT", `/lists/${encodeURIComponent(config.listId)}/closed`, { params: { value: true } });
  return { success: true, list: data };
}

async function opMoveListToBoard(config, client) {
  if (!config.listId || !config.boardId) return { success: false, error: "Trello moveListToBoard: 'listId' and 'boardId' are required.", skipped: true };
  const data = await req(client, "PUT", `/lists/${encodeURIComponent(config.listId)}/idBoard`, { params: { value: config.boardId } });
  return { success: true, list: data };
}

export const boardOperations = {
  listBoards: opListBoards,
  getBoard: opGetBoard,
  createBoard: opCreateBoard,
  updateBoard: opUpdateBoard,
  deleteBoard: opDeleteBoard,
  listBoardMembers: opListBoardMembers,
  listBoardLabels: opListBoardLabels,
  listLists: opListLists,
  getList: opGetList,
  createList: opCreateList,
  updateList: opUpdateList,
  archiveList: opArchiveList,
  moveListToBoard: opMoveListToBoard,
};

/**
 * Monday.com — Board & Column resources. Board CRUD + duplicate/archive,
 * board columns, board groups live here (structure of a board).
 */
import { gql, boundLimit } from "../GenericFunctions.js";

/* ---- Board ---- */
async function opListBoards(config, client) {
  const result = await gql(client, `
    query($limit: Int, $page: Int) {
      boards(limit: $limit, page: $page) { id name description state board_kind workspace_id }
    }
  `, { limit: boundLimit(config.limit, 100), page: Number(config.page) || 1 });
  return { success: true, boards: result.boards ?? [] };
}

async function opGetBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Monday getBoard: boardId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) {
      boards(ids: [$id]) { id name description board_kind state columns { id title type } groups { id title color } owners { id name } }
    }
  `, { id: String(config.boardId) });
  const board = result.boards?.[0];
  if (!board) return { success: false, error: `Monday: Board ${config.boardId} not found.`, skipped: true };
  return { success: true, ...board };
}

async function opCreateBoard(config, client) {
  if (!config.boardName) return { success: false, error: "Monday createBoard: boardName required.", skipped: true };
  const kind = ["public", "private", "share"].includes(config.boardKind) ? config.boardKind : "public";
  const result = await gql(client, `
    mutation($name: String!, $kind: BoardKind!, $workspaceId: ID, $templateId: ID, $description: String) {
      create_board(board_name: $name, board_kind: $kind, workspace_id: $workspaceId, template_id: $templateId, description: $description) { id name board_kind }
    }
  `, {
    name: config.boardName, kind,
    workspaceId: config.workspaceId ? String(config.workspaceId) : null,
    templateId: config.templateId ? String(config.templateId) : null,
    description: config.description || null,
  });
  return { success: true, ...result.create_board };
}

async function opUpdateBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Monday updateBoard: boardId required.", skipped: true };
  if (!config.attribute) return { success: false, error: "Monday updateBoard: attribute required (name/description/communication).", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $attr: BoardAttributes!, $value: String!) {
      update_board(board_id: $boardId, board_attribute: $attr, new_value: $value)
    }
  `, { boardId: String(config.boardId), attr: config.attribute, value: String(config.value ?? "") });
  return { success: true, updated: true, result: result.update_board };
}

async function opArchiveBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Monday archiveBoard: boardId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { archive_board(board_id: $id) { id state } }`, { id: String(config.boardId) });
  return { success: true, ...result.archive_board };
}

async function opDeleteBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Monday deleteBoard: boardId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { delete_board(board_id: $id) { id } }`, { id: String(config.boardId) });
  return { success: true, deleted: true, id: result.delete_board?.id };
}

async function opDuplicateBoard(config, client) {
  if (!config.boardId) return { success: false, error: "Monday duplicateBoard: boardId required.", skipped: true };
  const type = config.duplicateType || "duplicate_board_with_structure";
  const result = await gql(client, `
    mutation($boardId: ID!, $type: DuplicateBoardType!, $name: String) {
      duplicate_board(board_id: $boardId, duplicate_type: $type, board_name: $name) { board { id name } }
    }
  `, { boardId: String(config.boardId), type, name: config.boardName || null });
  return { success: true, ...(result.duplicate_board?.board ?? {}) };
}

/* ---- Column ---- */
async function opListColumns(config, client) {
  if (!config.boardId) return { success: false, error: "Monday listColumns: boardId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) { boards(ids: [$id]) { columns { id title type settings_str archived } } }
  `, { id: String(config.boardId) });
  return { success: true, columns: result.boards?.[0]?.columns ?? [] };
}

async function opCreateColumn(config, client) {
  if (!config.boardId) return { success: false, error: "Monday createColumn: boardId required.", skipped: true };
  if (!config.title) return { success: false, error: "Monday createColumn: title required.", skipped: true };
  const colType = config.columnType || "text";
  const result = await gql(client, `
    mutation($boardId: ID!, $title: String!, $type: ColumnType!, $defaults: JSON, $description: String) {
      create_column(board_id: $boardId, title: $title, column_type: $type, defaults: $defaults, description: $description) { id title type }
    }
  `, {
    boardId: String(config.boardId), title: config.title, type: colType,
    defaults: config.defaults || null, description: config.description || null,
  });
  return { success: true, ...result.create_column };
}

async function opDeleteColumn(config, client) {
  if (!config.boardId) return { success: false, error: "Monday deleteColumn: boardId required.", skipped: true };
  if (!config.columnId) return { success: false, error: "Monday deleteColumn: columnId required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $columnId: String!) { delete_column(board_id: $boardId, column_id: $columnId) { id } }
  `, { boardId: String(config.boardId), columnId: config.columnId });
  return { success: true, deleted: true, id: result.delete_column?.id };
}

/* ---- Group ---- */
async function opListGroups(config, client) {
  if (!config.boardId) return { success: false, error: "Monday listGroups: boardId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) { boards(ids: [$id]) { groups { id title color position archived } } }
  `, { id: String(config.boardId) });
  return { success: true, groups: result.boards?.[0]?.groups ?? [] };
}

async function opCreateGroup(config, client) {
  if (!config.boardId) return { success: false, error: "Monday createGroup: boardId required.", skipped: true };
  if (!config.groupName) return { success: false, error: "Monday createGroup: groupName required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $name: String!) { create_group(board_id: $boardId, group_name: $name) { id title } }
  `, { boardId: String(config.boardId), name: config.groupName });
  return { success: true, ...result.create_group };
}

async function opDeleteGroup(config, client) {
  if (!config.boardId) return { success: false, error: "Monday deleteGroup: boardId required.", skipped: true };
  if (!config.groupId) return { success: false, error: "Monday deleteGroup: groupId required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $groupId: String!) { delete_group(board_id: $boardId, group_id: $groupId) { id } }
  `, { boardId: String(config.boardId), groupId: config.groupId });
  return { success: true, deleted: true, id: result.delete_group?.id };
}

async function opArchiveGroup(config, client) {
  if (!config.boardId) return { success: false, error: "Monday archiveGroup: boardId required.", skipped: true };
  if (!config.groupId) return { success: false, error: "Monday archiveGroup: groupId required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $groupId: String!) { archive_group(board_id: $boardId, group_id: $groupId) { id archived } }
  `, { boardId: String(config.boardId), groupId: config.groupId });
  return { success: true, ...result.archive_group };
}

async function opDuplicateGroup(config, client) {
  if (!config.boardId) return { success: false, error: "Monday duplicateGroup: boardId required.", skipped: true };
  if (!config.groupId) return { success: false, error: "Monday duplicateGroup: groupId required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $groupId: String!, $addToTop: Boolean, $groupTitle: String) {
      duplicate_group(board_id: $boardId, group_id: $groupId, add_to_top: $addToTop, group_title: $groupTitle) { id title }
    }
  `, { boardId: String(config.boardId), groupId: config.groupId, addToTop: config.addToTop ?? null, groupTitle: config.groupName || null });
  return { success: true, ...result.duplicate_group };
}

export const boardOperations = {
  listBoards: opListBoards,
  getBoard: opGetBoard,
  createBoard: opCreateBoard,
  updateBoard: opUpdateBoard,
  archiveBoard: opArchiveBoard,
  deleteBoard: opDeleteBoard,
  duplicateBoard: opDuplicateBoard,
  listColumns: opListColumns,
  createColumn: opCreateColumn,
  deleteColumn: opDeleteColumn,
  listGroups: opListGroups,
  createGroup: opCreateGroup,
  deleteGroup: opDeleteGroup,
  archiveGroup: opArchiveGroup,
  duplicateGroup: opDuplicateGroup,
};

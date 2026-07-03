/**
 * Monday.com — Item, Subitem, and Update resources. Item CRUD, column
 * mutations, moves, archive/delete, subitem creation, and item updates
 * (comments) live here.
 */
import { gql, parseColumnValues, boundLimit } from "../GenericFunctions.js";

/* ---- Item ---- */
async function opListItems(config, client) {
  if (!config.boardId) return { success: false, error: "Monday listItems: boardId required.", skipped: true };
  const result = await gql(client, `
    query($boardId: ID!, $limit: Int) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit) {
          cursor
          items { id name state group { id title } column_values { id text value } created_at }
        }
      }
    }
  `, { boardId: String(config.boardId), limit: boundLimit(config.limit, 500) });
  const page = result.boards?.[0]?.items_page;
  return { success: true, items: page?.items ?? [], cursor: page?.cursor ?? null };
}

async function opGetItem(config, client) {
  if (!config.itemId) return { success: false, error: "Monday getItem: itemId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) {
      items(ids: [$id]) { id name state board { id name } group { id title } column_values { id ... on ColumnValue { text value type } } created_at updated_at }
    }
  `, { id: String(config.itemId) });
  const item = result.items?.[0];
  if (!item) return { success: false, error: `Monday: Item ${config.itemId} not found.`, skipped: true };
  return { success: true, ...item };
}

async function opGetItemsByColumnValue(config, client) {
  if (!config.boardId) return { success: false, error: "Monday getItemsByColumnValue: boardId required.", skipped: true };
  if (!config.columnId) return { success: false, error: "Monday getItemsByColumnValue: columnId required.", skipped: true };
  const result = await gql(client, `
    query($boardId: ID!, $columnId: String!, $value: String!, $limit: Int) {
      items_page_by_column_values(board_id: $boardId, limit: $limit, columns: [{ column_id: $columnId, column_values: [$value] }]) {
        cursor
        items { id name state column_values { id text value } }
      }
    }
  `, { boardId: String(config.boardId), columnId: config.columnId, value: String(config.value ?? ""), limit: boundLimit(config.limit, 500) });
  const page = result.items_page_by_column_values;
  return { success: true, items: page?.items ?? [], cursor: page?.cursor ?? null };
}

async function opCreateItem(config, client) {
  if (!config.boardId) return { success: false, error: "Monday createItem: boardId required.", skipped: true };
  if (!config.itemName) return { success: false, error: "Monday createItem: itemName required.", skipped: true };
  const colVals = parseColumnValues(config.columnValues);
  const result = await gql(client, `
    mutation($boardId: ID!, $itemName: String!, $colVals: JSON, $groupId: String, $createLabels: Boolean) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $colVals, group_id: $groupId, create_labels_if_missing: $createLabels) { id name created_at board { id } }
    }
  `, { boardId: String(config.boardId), itemName: config.itemName, colVals, groupId: config.groupId || null, createLabels: config.createLabelsIfMissing ?? null });
  return { success: true, ...result.create_item };
}

async function opUpdateItem(config, client) {
  if (!config.itemId) return { success: false, error: "Monday updateItem: itemId required.", skipped: true };
  if (!config.boardId) return { success: false, error: "Monday updateItem: boardId required.", skipped: true };
  if (!config.columnId) return { success: false, error: "Monday updateItem: columnId required.", skipped: true };
  let val;
  try {
    val = typeof config.value === "string" ? config.value : JSON.stringify(config.value);
  } catch {
    return { success: false, error: "Monday updateItem: value must be valid JSON.", skipped: true };
  }
  const result = await gql(client, `
    mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id name }
    }
  `, { boardId: String(config.boardId), itemId: String(config.itemId), colId: config.columnId, val });
  return { success: true, ...result.change_column_value };
}

async function opUpdateSimpleColumn(config, client) {
  if (!config.itemId) return { success: false, error: "Monday updateSimpleColumn: itemId required.", skipped: true };
  if (!config.boardId) return { success: false, error: "Monday updateSimpleColumn: boardId required.", skipped: true };
  if (!config.columnId) return { success: false, error: "Monday updateSimpleColumn: columnId required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: String!) {
      change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id name }
    }
  `, { boardId: String(config.boardId), itemId: String(config.itemId), colId: config.columnId, val: String(config.value ?? "") });
  return { success: true, ...result.change_simple_column_value };
}

async function opUpdateMultipleColumns(config, client) {
  if (!config.itemId) return { success: false, error: "Monday updateMultipleColumns: itemId required.", skipped: true };
  if (!config.boardId) return { success: false, error: "Monday updateMultipleColumns: boardId required.", skipped: true };
  const colVals = parseColumnValues(config.columnValues);
  if (!colVals) return { success: false, error: "Monday updateMultipleColumns: columnValues required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $itemId: ID!, $colVals: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $colVals) { id name }
    }
  `, { boardId: String(config.boardId), itemId: String(config.itemId), colVals });
  return { success: true, ...result.change_multiple_column_values };
}

async function opDeleteItem(config, client) {
  if (!config.itemId) return { success: false, error: "Monday deleteItem: itemId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { delete_item(item_id: $id) { id } }`, { id: String(config.itemId) });
  return { success: true, deleted: true, id: result.delete_item?.id };
}

async function opArchiveItem(config, client) {
  if (!config.itemId) return { success: false, error: "Monday archiveItem: itemId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { archive_item(item_id: $id) { id state } }`, { id: String(config.itemId) });
  return { success: true, ...result.archive_item };
}

async function opMoveItemToGroup(config, client) {
  if (!config.itemId) return { success: false, error: "Monday moveItemToGroup: itemId required.", skipped: true };
  if (!config.groupId) return { success: false, error: "Monday moveItemToGroup: groupId required.", skipped: true };
  const result = await gql(client, `
    mutation($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) { id name group { id title } }
    }
  `, { itemId: String(config.itemId), groupId: config.groupId });
  return { success: true, ...result.move_item_to_group };
}

async function opMoveItemToBoard(config, client) {
  if (!config.itemId) return { success: false, error: "Monday moveItemToBoard: itemId required.", skipped: true };
  if (!config.boardId) return { success: false, error: "Monday moveItemToBoard: boardId (target) required.", skipped: true };
  if (!config.groupId) return { success: false, error: "Monday moveItemToBoard: groupId (target) required.", skipped: true };
  const result = await gql(client, `
    mutation($boardId: ID!, $groupId: ID!, $itemId: ID!) {
      move_item_to_board(board_id: $boardId, group_id: $groupId, item_id: $itemId) { id name }
    }
  `, { boardId: String(config.boardId), groupId: String(config.groupId), itemId: String(config.itemId) });
  return { success: true, ...result.move_item_to_board };
}

async function opClearItemUpdates(config, client) {
  if (!config.itemId) return { success: false, error: "Monday clearItemUpdates: itemId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { clear_item_updates(item_id: $id) { id } }`, { id: String(config.itemId) });
  return { success: true, cleared: true, id: result.clear_item_updates?.id };
}

/* ---- Subitem ---- */
async function opCreateSubitem(config, client) {
  if (!config.itemId) return { success: false, error: "Monday createSubitem: itemId (parent) required.", skipped: true };
  if (!config.itemName) return { success: false, error: "Monday createSubitem: itemName required.", skipped: true };
  const colVals = parseColumnValues(config.columnValues);
  const result = await gql(client, `
    mutation($parentId: ID!, $itemName: String!, $colVals: JSON) {
      create_subitem(parent_item_id: $parentId, item_name: $itemName, column_values: $colVals) { id name board { id } }
    }
  `, { parentId: String(config.itemId), itemName: config.itemName, colVals });
  return { success: true, ...result.create_subitem };
}

async function opListSubitems(config, client) {
  if (!config.itemId) return { success: false, error: "Monday listSubitems: itemId (parent) required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) { items(ids: [$id]) { subitems { id name state column_values { id text value } } } }
  `, { id: String(config.itemId) });
  return { success: true, subitems: result.items?.[0]?.subitems ?? [] };
}

/* ---- Update (comments) ---- */
async function opCreateUpdate(config, client) {
  if (!config.itemId) return { success: false, error: "Monday createUpdate: itemId required.", skipped: true };
  if (!config.body) return { success: false, error: "Monday createUpdate: body required.", skipped: true };
  const result = await gql(client, `
    mutation($itemId: ID!, $body: String!, $parentId: ID) {
      create_update(item_id: $itemId, body: $body, parent_id: $parentId) { id body created_at }
    }
  `, { itemId: String(config.itemId), body: config.body, parentId: config.parentId ? String(config.parentId) : null });
  return { success: true, ...result.create_update };
}

async function opListUpdates(config, client) {
  if (!config.itemId) return { success: false, error: "Monday listUpdates: itemId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!, $limit: Int) { items(ids: [$id]) { updates(limit: $limit) { id body created_at creator { id name } } } }
  `, { id: String(config.itemId), limit: boundLimit(config.limit, 100, 25) });
  return { success: true, updates: result.items?.[0]?.updates ?? [] };
}

async function opDeleteUpdate(config, client) {
  if (!config.updateId) return { success: false, error: "Monday deleteUpdate: updateId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { delete_update(id: $id) { id } }`, { id: String(config.updateId) });
  return { success: true, deleted: true, id: result.delete_update?.id };
}

async function opLikeUpdate(config, client) {
  if (!config.updateId) return { success: false, error: "Monday likeUpdate: updateId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { like_update(update_id: $id) { id } }`, { id: String(config.updateId) });
  return { success: true, liked: true, id: result.like_update?.id };
}

export const itemOperations = {
  listItems: opListItems,
  getItem: opGetItem,
  getItemsByColumnValue: opGetItemsByColumnValue,
  createItem: opCreateItem,
  updateItem: opUpdateItem,
  updateSimpleColumn: opUpdateSimpleColumn,
  updateMultipleColumns: opUpdateMultipleColumns,
  deleteItem: opDeleteItem,
  archiveItem: opArchiveItem,
  moveItemToGroup: opMoveItemToGroup,
  moveItemToBoard: opMoveItemToBoard,
  clearItemUpdates: opClearItemUpdates,
  createSubitem: opCreateSubitem,
  listSubitems: opListSubitems,
  createUpdate: opCreateUpdate,
  listUpdates: opListUpdates,
  deleteUpdate: opDeleteUpdate,
  likeUpdate: opLikeUpdate,
};

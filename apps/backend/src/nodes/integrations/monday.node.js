import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const GQL_URL = "https://api.monday.com/v2";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Monday");
}

async function gql(token, query, variables = {}) {
  let res;
  try {
    res = await axios.post(
      GQL_URL,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "API-Version": "2024-01",
        },
        timeout: 20000,
      }
    );
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.errors?.[0]?.message ?? err.message;
    if (status === 401 || status === 403) throw new Error(`Monday: Auth failed — ${msg}. Check your API token.`);
    if (status === 429) throw new Error(`Monday: Rate limit exceeded — slow down requests.`);
    throw new Error(`Monday: HTTP ${status ?? "Error"} — ${msg}`);
  }
  if (res.data.errors?.length) {
    const msg = res.data.errors[0].message;
    if (msg.includes("not found") || msg.includes("doesn't exist")) throw new Error(`Monday: Resource not found — ${msg}`);
    if (msg.includes("permission") || msg.includes("authorized")) throw new Error(`Monday: Permission denied — ${msg}`);
    throw new Error(`Monday: GraphQL error — ${msg}`);
  }
  return res.data.data;
}

function parseColumnValues(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    throw new Error("Monday: columnValues must be valid JSON.");
  }
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createItem";

    if (!config.credentialId) {
      return { success: false, error: "Monday: credential required.", skipped: true };
    }

    const token = await getToken(config.credentialId, context.workspaceId);

    try {
      switch (operation) {
        case "listBoards": {
          const result = await gql(token, `
            query($limit: Int) {
              boards(limit: $limit) { id name description state board_kind }
            }
          `, { limit: Math.min(Number(config.limit) || 50, 100) });
          return { success: true, boards: result.boards ?? [] };
        }

        case "getBoard": {
          if (!config.boardId) return { success: false, error: "Monday getBoard: boardId required.", skipped: true };
          const result = await gql(token, `
            query($id: ID!) {
              boards(ids: [$id]) { id name description board_kind columns { id title type } groups { id title } }
            }
          `, { id: String(config.boardId) });
          const board = result.boards?.[0];
          if (!board) return { success: false, error: `Monday: Board ${config.boardId} not found.`, skipped: true };
          return { success: true, ...board };
        }

        case "listItems": {
          if (!config.boardId) return { success: false, error: "Monday listItems: boardId required.", skipped: true };
          const result = await gql(token, `
            query($boardId: ID!, $limit: Int) {
              boards(ids: [$boardId]) {
                items_page(limit: $limit) {
                  items { id name state group { id title } column_values { id text value } created_at }
                }
              }
            }
          `, { boardId: String(config.boardId), limit: Math.min(Number(config.limit) || 50, 500) });
          return { success: true, items: result.boards?.[0]?.items_page?.items ?? [] };
        }

        case "getItem": {
          if (!config.itemId) return { success: false, error: "Monday getItem: itemId required.", skipped: true };
          const result = await gql(token, `
            query($id: ID!) {
              items(ids: [$id]) { id name state board { id name } group { id title } column_values { id title text value } created_at updated_at }
            }
          `, { id: String(config.itemId) });
          const item = result.items?.[0];
          if (!item) return { success: false, error: `Monday: Item ${config.itemId} not found.`, skipped: true };
          return { success: true, ...item };
        }

        case "createItem": {
          if (!config.boardId) return { success: false, error: "Monday createItem: boardId required.", skipped: true };
          if (!config.itemName) return { success: false, error: "Monday createItem: itemName required.", skipped: true };
          const colVals = parseColumnValues(config.columnValues);
          const result = await gql(token, `
            mutation($boardId: ID!, $itemName: String!, $colVals: JSON, $groupId: String) {
              create_item(board_id: $boardId, item_name: $itemName, column_values: $colVals, group_id: $groupId) { id name created_at board { id } }
            }
          `, { boardId: String(config.boardId), itemName: config.itemName, colVals, groupId: config.groupId || null });
          return { success: true, ...result.create_item };
        }

        case "updateItem": {
          if (!config.itemId) return { success: false, error: "Monday updateItem: itemId required.", skipped: true };
          if (!config.boardId) return { success: false, error: "Monday updateItem: boardId required.", skipped: true };
          if (!config.columnId) return { success: false, error: "Monday updateItem: columnId required.", skipped: true };
          let val;
          try {
            val = typeof config.value === "string" ? config.value : JSON.stringify(config.value);
          } catch {
            return { success: false, error: "Monday updateItem: value must be valid JSON.", skipped: true };
          }
          const result = await gql(token, `
            mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) {
              change_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id name }
            }
          `, { boardId: String(config.boardId), itemId: String(config.itemId), colId: config.columnId, val });
          return { success: true, ...result.change_column_value };
        }

        case "updateMultipleColumns": {
          if (!config.itemId) return { success: false, error: "Monday updateMultipleColumns: itemId required.", skipped: true };
          if (!config.boardId) return { success: false, error: "Monday updateMultipleColumns: boardId required.", skipped: true };
          const colVals = parseColumnValues(config.columnValues);
          if (!colVals) return { success: false, error: "Monday updateMultipleColumns: columnValues required.", skipped: true };
          const result = await gql(token, `
            mutation($boardId: ID!, $itemId: ID!, $colVals: JSON!) {
              change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $colVals) { id name }
            }
          `, { boardId: String(config.boardId), itemId: String(config.itemId), colVals });
          return { success: true, ...result.change_multiple_column_values };
        }

        case "deleteItem": {
          if (!config.itemId) return { success: false, error: "Monday deleteItem: itemId required.", skipped: true };
          const result = await gql(token, `
            mutation($id: ID!) { delete_item(item_id: $id) { id } }
          `, { id: String(config.itemId) });
          return { success: true, deleted: true, id: result.delete_item?.id };
        }

        case "archiveItem": {
          if (!config.itemId) return { success: false, error: "Monday archiveItem: itemId required.", skipped: true };
          const result = await gql(token, `
            mutation($id: ID!) { archive_item(item_id: $id) { id state } }
          `, { id: String(config.itemId) });
          return { success: true, ...result.archive_item };
        }

        case "createUpdate": {
          if (!config.itemId) return { success: false, error: "Monday createUpdate: itemId required.", skipped: true };
          if (!config.body) return { success: false, error: "Monday createUpdate: body required.", skipped: true };
          const result = await gql(token, `
            mutation($itemId: ID!, $body: String!) {
              create_update(item_id: $itemId, body: $body) { id body created_at }
            }
          `, { itemId: String(config.itemId), body: config.body });
          return { success: true, ...result.create_update };
        }

        case "createBoard": {
          if (!config.boardName) return { success: false, error: "Monday createBoard: boardName required.", skipped: true };
          const kind = ["public", "private", "share"].includes(config.boardKind) ? config.boardKind : "public";
          const result = await gql(token, `
            mutation($name: String!, $kind: BoardKind!) {
              create_board(board_name: $name, board_kind: $kind) { id name board_kind }
            }
          `, { name: config.boardName, kind });
          return { success: true, ...result.create_board };
        }

        case "getMe": {
          const result = await gql(token, `query { me { id name email } }`);
          return { success: true, ...result.me };
        }

        default:
          throw new Error(`Monday: Unknown operation "${operation}".`);
      }
    } catch (err) {
      if (err.message?.startsWith("Monday")) throw err;
      throw new Error(`Monday: ${err.message}`);
    }
  },
};

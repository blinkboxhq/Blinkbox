import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const GQL_URL = "https://api.monday.com/v2";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Monday");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function gql(token, query, variables = {}) {
  const { data } = await axios.post(
    GQL_URL,
    { query, variables },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "API-Version": "2024-01",
      },
    }
  );
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createItem";

    if (!config.credentialId) {
      return { success: false, error: "Monday: credential required.", skipped: true };
    }

    const token = await getToken(config.credentialId, context.workspaceId);

    switch (operation) {
      case "listBoards": {
        const result = await gql(token, `query { boards(limit: 50) { id name description state } }`);
        return { success: true, boards: result.boards };
      }

      case "getBoard": {
        if (!config.boardId) return { success: false, error: "Monday: boardId required.", skipped: true };
        const result = await gql(token, `query($id: ID!) { boards(ids: [$id]) { id name description columns { id title type } } }`, { id: config.boardId });
        return { success: true, ...result.boards?.[0] };
      }

      case "listItems": {
        if (!config.boardId) return { success: false, error: "Monday: boardId required.", skipped: true };
        const result = await gql(
          token,
          `query($boardId: ID!) { boards(ids: [$boardId]) { items_page(limit: 50) { items { id name state column_values { id text value } created_at } } } }`,
          { boardId: config.boardId }
        );
        return { success: true, items: result.boards?.[0]?.items_page?.items };
      }

      case "getItem": {
        if (!config.itemId) return { success: false, error: "Monday: itemId required.", skipped: true };
        const result = await gql(
          token,
          `query($id: ID!) { items(ids: [$id]) { id name state board { id name } column_values { id title text value } created_at } }`,
          { id: config.itemId }
        );
        return { success: true, ...result.items?.[0] };
      }

      case "createItem": {
        if (!config.boardId) return { success: false, error: "Monday: boardId required.", skipped: true };
        if (!config.itemName) return { success: false, error: "Monday: itemName required.", skipped: true };
        let colVals = null;
        if (config.columnValues) {
          try {
            colVals = typeof config.columnValues === "string" ? config.columnValues : JSON.stringify(config.columnValues);
          } catch {
            return { success: false, error: "Monday: columnValues must be valid JSON.", skipped: true };
          }
        }
        const result = await gql(
          token,
          `mutation($boardId: ID!, $itemName: String!, $colVals: JSON) { create_item(board_id: $boardId, item_name: $itemName, column_values: $colVals) { id name created_at } }`,
          { boardId: config.boardId, itemName: config.itemName, colVals }
        );
        return { success: true, ...result.create_item };
      }

      case "updateItem": {
        if (!config.itemId) return { success: false, error: "Monday: itemId required.", skipped: true };
        if (!config.boardId) return { success: false, error: "Monday: boardId required for update.", skipped: true };
        if (!config.columnId) return { success: false, error: "Monday: columnId required.", skipped: true };
        let val;
        try {
          val = typeof config.value === "string" ? config.value : JSON.stringify(config.value);
        } catch {
          return { success: false, error: "Monday: value must be valid JSON.", skipped: true };
        }
        const result = await gql(
          token,
          `mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) { change_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id name } }`,
          { boardId: config.boardId, itemId: config.itemId, colId: config.columnId, val }
        );
        return { success: true, ...result.change_column_value };
      }

      case "changeItemColumn": {
        if (!config.itemId) return { success: false, error: "Monday: itemId required.", skipped: true };
        if (!config.boardId) return { success: false, error: "Monday: boardId required.", skipped: true };
        if (!config.columnId) return { success: false, error: "Monday: columnId required.", skipped: true };
        let val;
        try {
          val = typeof config.value === "string" ? config.value : JSON.stringify(config.value);
        } catch {
          return { success: false, error: "Monday: value must be valid JSON.", skipped: true };
        }
        const result = await gql(
          token,
          `mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) { change_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id name } }`,
          { boardId: config.boardId, itemId: config.itemId, colId: config.columnId, val }
        );
        return { success: true, ...result.change_column_value };
      }

      case "deleteItem": {
        if (!config.itemId) return { success: false, error: "Monday: itemId required.", skipped: true };
        const result = await gql(
          token,
          `mutation($id: ID!) { delete_item(item_id: $id) { id } }`,
          { id: config.itemId }
        );
        return { success: true, deleted: true, id: result.delete_item?.id };
      }

      case "createUpdate": {
        if (!config.itemId) return { success: false, error: "Monday: itemId required.", skipped: true };
        if (!config.body) return { success: false, error: "Monday: body required.", skipped: true };
        const result = await gql(
          token,
          `mutation($itemId: ID!, $body: String!) { create_update(item_id: $itemId, body: $body) { id created_at } }`,
          { itemId: config.itemId, body: config.body }
        );
        return { success: true, ...result.create_update };
      }

      case "createBoard": {
        if (!config.boardName) return { success: false, error: "Monday: boardName required.", skipped: true };
        const result = await gql(
          token,
          `mutation($name: String!, $kind: BoardKind!) { create_board(board_name: $name, board_kind: $kind) { id name } }`,
          { name: config.boardName, kind: config.boardKind || "public" }
        );
        return { success: true, ...result.create_board };
      }

      default:
        return { success: false, error: `Monday: Unknown operation "${operation}".`, skipped: true };
    }
  },
};

export default {
  backendType: "monday",
  label: "Monday.com",
  description: "Create and manage Monday.com items, boards, and updates.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#FF3D57" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createItem", options: [
      { value: "createItem",           label: "Create Item" },
      { value: "getItem",              label: "Get Item" },
      { value: "updateItem",           label: "Update Item" },
      { value: "deleteItem",           label: "Delete Item" },
      { value: "archiveItem",          label: "Archive Item" },
      { value: "listItems",            label: "List Items" },
      { value: "createBoard",          label: "Create Board" },
      { value: "getBoard",             label: "Get Board" },
      { value: "listBoards",           label: "List Boards" },
      { value: "createUpdate",         label: "Create Update" },
      { value: "createColumn",         label: "Create Column" },
      { value: "moveItemToGroup",      label: "Move to Group" },
      { value: "updateMultipleColumns", label: "Update Columns" },
    ]},

    { name: "boardId", label: "Board ID", type: "string", smart: true, show: { operation: ["createItem", "listItems", "updateItem", "getBoard", "createColumn", "updateMultipleColumns"] } },
    { name: "groupId", label: "Group ID", type: "string", smart: true, optional: true, show: { operation: ["createItem", "moveItemToGroup"] } },
    { name: "itemName", label: "Item Name", type: "string", smart: true, show: { operation: ["createItem"] } },
    { name: "columnValues", label: "Column Values", type: "string", smart: true, multiline: true, optional: true, hint: "JSON: {column_id: value}", show: { operation: ["createItem"] } },

    { name: "itemId", label: "Item ID", type: "string", smart: true, show: { operation: ["getItem", "updateItem", "deleteItem", "archiveItem", "createUpdate", "moveItemToGroup", "updateMultipleColumns"] } },

    { name: "columnId", label: "Column ID", type: "string", smart: true, show: { operation: ["updateItem"] } },
    { name: "value", label: "Value", type: "string", smart: true, show: { operation: ["updateItem"] } },

    { name: "limit", label: "Limit", type: "number", default: 50, show: { operation: ["listItems"] } },

    { name: "boardName", label: "Board Name", type: "string", smart: true, show: { operation: ["createBoard"] } },
    { name: "boardKind", label: "Board Kind", type: "options", cols: 3, default: "public", options: [
      { value: "public",  label: "Public" },
      { value: "private", label: "Private" },
      { value: "share",   label: "Share" },
    ], show: { operation: ["createBoard"] } },
    { name: "workspaceId", label: "Workspace ID", type: "string", smart: true, optional: true, show: { operation: ["createBoard"] } },

    { name: "listBoardsLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listBoards"] } },

    { name: "updateBody", label: "Update Body", type: "string", smart: true, multiline: true, show: { operation: ["createUpdate"] } },

    { name: "columnTitle", label: "Column Title", type: "string", smart: true, show: { operation: ["createColumn"] } },
    { name: "columnType", label: "Column Type", type: "options", cols: 3, default: "text", options: [
      { value: "text",     label: "Text" },
      { value: "numbers",  label: "Numbers" },
      { value: "status",   label: "Status" },
      { value: "date",     label: "Date" },
      { value: "people",   label: "People" },
      { value: "checkbox", label: "Checkbox" },
      { value: "email",    label: "Email" },
      { value: "phone",    label: "Phone" },
    ], show: { operation: ["createColumn"] } },

    { name: "multiColumnValues", label: "Column Values", type: "string", smart: true, multiline: true, hint: "JSON: {col_id: value, col2: value}", show: { operation: ["updateMultipleColumns"] } },
  ],
  outputs: ["item", "items", "board", "update"],
};

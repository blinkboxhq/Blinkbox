export default {
  backendType: "trello",
  label: "Trello",
  description: "Create and manage Trello cards, lists, and boards.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#0052CC" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createCard", options: [
      { value: "createCard",  label: "Create Card" },
      { value: "getCard",     label: "Get Card" },
      { value: "updateCard",  label: "Update Card" },
      { value: "archiveCard", label: "Archive Card" },
      { value: "moveCard",    label: "Move Card" },
      { value: "addComment",  label: "Add Comment" },
      { value: "addLabel",    label: "Add Label" },
      { value: "listBoards",  label: "List Boards" },
      { value: "listLists",   label: "List Lists" },
      { value: "listCards",   label: "List Cards" },
      { value: "createList",  label: "Create List" },
    ]},

    { name: "listId", label: "List ID", type: "string", smart: true, placeholder: "Trello list ID", show: { operation: ["createCard", "listCards"] } },
    { name: "cardName", label: "Card Name", type: "string", smart: true, show: { operation: ["createCard"] } },
    { name: "desc", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createCard", "updateCard"] } },
    { name: "due", label: "Due Date", type: "string", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: ["createCard", "updateCard"] } },
    { name: "pos", label: "Position", type: "options", cols: 2, default: "bottom", options: [
      { value: "top",    label: "Top" },
      { value: "bottom", label: "Bottom" },
    ], show: { operation: ["createCard", "createList"] } },

    { name: "cardId", label: "Card ID", type: "string", smart: true, show: { operation: ["getCard", "updateCard", "archiveCard", "moveCard", "addComment", "addLabel"] } },

    { name: "updateName", label: "Card Name", type: "string", smart: true, optional: true, show: { operation: ["updateCard"] } },
    { name: "closed", label: "Archived", type: "boolean", show: { operation: ["updateCard"] } },

    { name: "moveListId", label: "Destination List ID", type: "string", smart: true, placeholder: "Destination list ID", show: { operation: ["moveCard"] } },

    { name: "commentText", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["addComment"] } },

    { name: "labelColor", label: "Label Color", type: "options", cols: 3, options: [
      { value: "red",    label: "Red" },
      { value: "orange", label: "Orange" },
      { value: "yellow", label: "Yellow" },
      { value: "green",  label: "Green" },
      { value: "blue",   label: "Blue" },
      { value: "purple", label: "Purple" },
      { value: "pink",   label: "Pink" },
      { value: "sky",    label: "Sky" },
      { value: "lime",   label: "Lime" },
      { value: "black",  label: "Black" },
    ], show: { operation: ["addLabel"] } },

    { name: "boardId", label: "Board ID", type: "string", smart: true, show: { operation: ["listLists", "createList"] } },

    { name: "newListName", label: "List Name", type: "string", smart: true, show: { operation: ["createList"] } },
  ],
  outputs: ["card", "cards", "boards", "lists", "comment"],
};

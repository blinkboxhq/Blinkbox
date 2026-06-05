export default {
  backendType: "clickup",
  label: "ClickUp",
  description: "Create and manage ClickUp tasks, lists, folders, and spaces.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#7B68EE" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createTask", options: [
      { value: "createTask",   label: "Create Task" },
      { value: "getTask",      label: "Get Task" },
      { value: "updateTask",   label: "Update Task" },
      { value: "deleteTask",   label: "Delete Task" },
      { value: "listTasks",    label: "List Tasks" },
      { value: "addComment",   label: "Add Comment" },
      { value: "createList",   label: "Create List" },
      { value: "getList",      label: "Get List" },
      { value: "createFolder", label: "Create Folder" },
      { value: "listFolders",  label: "List Folders" },
      { value: "listLists",    label: "List Lists" },
      { value: "createSpace",  label: "Create Space" },
      { value: "listSpaces",   label: "List Spaces" },
    ]},

    { name: "listId", label: "List ID", type: "string", smart: true, placeholder: "ClickUp list ID", show: { operation: ["createTask", "listTasks", "getList"] } },
    { name: "taskName", label: "Task Name", type: "string", smart: true, show: { operation: ["createTask"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createTask", "updateTask"] } },
    { name: "priority", label: "Priority", type: "options", cols: 2, default: "Normal", options: [
      { value: "Urgent", label: "Urgent" },
      { value: "High",   label: "High" },
      { value: "Normal", label: "Normal" },
      { value: "Low",    label: "Low" },
    ], show: { operation: ["createTask", "updateTask"] } },
    { name: "dueDate", label: "Due Date", type: "string", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: ["createTask"] } },
    { name: "assignees", label: "Assignees", type: "string", smart: true, optional: true, hint: "Comma-separated user IDs", show: { operation: ["createTask"] } },

    { name: "taskId", label: "Task ID", type: "string", smart: true, show: { operation: ["getTask", "updateTask", "deleteTask", "addComment"] } },

    { name: "updateName", label: "Task Name", type: "string", smart: true, optional: true, show: { operation: ["updateTask"] } },
    { name: "status", label: "Status", type: "string", smart: true, optional: true, show: { operation: ["updateTask"] } },

    { name: "archived", label: "Include Archived", type: "boolean", default: false, show: { operation: ["listTasks"] } },
    { name: "limit", label: "Limit", type: "number", default: 100, show: { operation: ["listTasks"] } },

    { name: "commentText", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["addComment"] } },

    { name: "folderId", label: "Folder ID", type: "string", smart: true, optional: true, hint: "Leave blank to create in space", show: { operation: ["createList", "listLists"] } },
    { name: "createListSpaceId", label: "Space ID", type: "string", smart: true, optional: true, show: { operation: ["createList"] } },
    { name: "listName", label: "List Name", type: "string", smart: true, show: { operation: ["createList"] } },

    { name: "spaceId", label: "Space ID", type: "string", smart: true, show: { operation: ["createFolder", "listFolders"] } },
    { name: "folderName", label: "Folder Name", type: "string", smart: true, show: { operation: ["createFolder"] } },

    { name: "teamId", label: "Workspace ID", type: "string", smart: true, placeholder: "ClickUp workspace ID", show: { operation: ["createSpace", "listSpaces"] } },
    { name: "spaceName", label: "Space Name", type: "string", smart: true, show: { operation: ["createSpace"] } },
  ],
  outputs: ["task", "tasks", "list", "folder", "space"],
};

export default {
  backendType: "asana",
  label: "Asana",
  description: "Create and manage Asana tasks, projects, and comments.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#F06A6A" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createTask", options: [
      { value: "createTask",    label: "Create Task" },
      { value: "getTask",       label: "Get Task" },
      { value: "updateTask",    label: "Update Task" },
      { value: "completeTask",  label: "Complete Task" },
      { value: "listTasks",     label: "List Tasks" },
      { value: "createProject", label: "Create Project" },
      { value: "listProjects",  label: "List Projects" },
      { value: "addComment",    label: "Add Comment" },
    ]},

    { name: "projectId", label: "Project GID", type: "string", smart: true, placeholder: "Project GID", show: { operation: ["createTask", "listTasks"] } },
    { name: "taskName", label: "Task Name", type: "string", smart: true, show: { operation: ["createTask"] } },
    { name: "notes", label: "Notes", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createTask", "updateTask"] } },
    { name: "dueOn", label: "Due On", type: "string", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: ["createTask", "updateTask"] } },
    { name: "assignee", label: "Assignee", type: "string", smart: true, optional: true, hint: "User GID or email", show: { operation: ["createTask", "listTasks"] } },

    { name: "taskId", label: "Task GID", type: "string", smart: true, placeholder: "Task GID", show: { operation: ["getTask", "updateTask", "completeTask", "addComment"] } },

    { name: "updateName", label: "Task Name", type: "string", smart: true, optional: true, show: { operation: ["updateTask"] } },
    { name: "completed", label: "Completed", type: "boolean", show: { operation: ["updateTask", "listTasks"] } },
    { name: "listCompleted", label: "Show Completed", type: "boolean", default: false, show: { operation: ["listTasks"] } },

    { name: "projectName", label: "Project Name", type: "string", smart: true, show: { operation: ["createProject"] } },
    { name: "workspaceId", label: "Workspace GID", type: "string", smart: true, placeholder: "Workspace GID", show: { operation: ["createProject", "listProjects"] } },
    { name: "teamId", label: "Team GID", type: "string", smart: true, optional: true, show: { operation: ["createProject"] } },
    { name: "projectNotes", label: "Notes", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createProject"] } },

    { name: "commentText", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["addComment"] } },
  ],
  outputs: ["task", "tasks", "project", "projects", "comment"],
};

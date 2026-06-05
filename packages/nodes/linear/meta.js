export default {
  backendType: "linear",
  label: "Linear",
  description: "Manage Linear issues, comments, teams, and projects.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#5E6AD2" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listIssues", options: [
      { value: "listIssues",     label: "List Issues" },
      { value: "getIssue",       label: "Get Issue" },
      { value: "createIssue",    label: "Create Issue" },
      { value: "updateIssue",    label: "Update Issue" },
      { value: "createComment",  label: "Create Comment" },
      { value: "listTeams",      label: "List Teams" },
      { value: "listProjects",   label: "List Projects" },
      { value: "createProject",  label: "Create Project" },
      { value: "assignIssue",    label: "Assign Issue" },
    ]},

    { name: "teamId", label: "Team ID", type: "string", smart: true, placeholder: "TEAM_ID", optional: true, show: { operation: ["listIssues", "createIssue", "listProjects", "createProject"] } },
    { name: "limit", label: "Limit", type: "number", default: 25, show: { operation: ["listIssues"] } },

    { name: "issueId", label: "Issue ID", type: "string", smart: true, placeholder: "ISSUE-123", show: { operation: ["getIssue", "updateIssue", "createComment", "assignIssue"] } },

    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "priority", label: "Priority", type: "options", cols: 3, default: "0", options: [
      { value: "0", label: "No Priority" },
      { value: "1", label: "Urgent" },
      { value: "2", label: "High" },
      { value: "3", label: "Medium" },
      { value: "4", label: "Low" },
    ], show: { operation: ["createIssue", "updateIssue"] } },
    { name: "stateId", label: "State ID", type: "string", smart: true, optional: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "assigneeId", label: "Assignee ID", type: "string", smart: true, optional: true, placeholder: "Linear user UUID", show: { operation: ["createIssue", "assignIssue"] } },

    { name: "body", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["createComment"] } },

    { name: "projectTeamId", label: "Team ID", type: "string", smart: true, optional: true, show: { operation: ["listProjects"] } },

    { name: "projectName", label: "Project Name", type: "string", smart: true, show: { operation: ["createProject"] } },
    { name: "projectDescription", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createProject"] } },
  ],
  outputs: ["issue", "issues", "comment", "teams", "projects"],
};

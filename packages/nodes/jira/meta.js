export default {
  backendType: "jira",
  label: "Jira",
  description: "Create and manage Jira issues, comments, and projects.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#0052CC" },
    { name: "_authNotice", label: "", type: "notice", level: "warning", text: "Auth: store as email:apiToken" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createIssue", options: [
      { value: "createIssue",     label: "Create Issue" },
      { value: "getIssue",        label: "Get Issue" },
      { value: "updateIssue",     label: "Update Issue" },
      { value: "transitionIssue", label: "Transition Issue" },
      { value: "searchIssues",    label: "Search Issues" },
      { value: "addComment",      label: "Add Comment" },
      { value: "listProjects",    label: "List Projects" },
    ]},
    { name: "domain", label: "Domain", type: "string", smart: false, placeholder: "yourcompany.atlassian.net" },

    { name: "project", label: "Project Key", type: "string", smart: true, placeholder: "PROJ", show: { operation: ["createIssue"] } },
    { name: "issueType", label: "Issue Type", type: "options", cols: 3, default: "Task", options: [
      { value: "Task",    label: "Task" },
      { value: "Bug",     label: "Bug" },
      { value: "Story",   label: "Story" },
      { value: "Epic",    label: "Epic" },
      { value: "Subtask", label: "Subtask" },
    ], show: { operation: ["createIssue"] } },
    { name: "summary", label: "Summary", type: "string", smart: true, show: { operation: ["createIssue"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIssue"] } },
    { name: "assignee", label: "Assignee", type: "string", smart: true, optional: true, placeholder: "Jira accountId", show: { operation: ["createIssue"] } },
    { name: "priority", label: "Priority", type: "options", cols: 3, default: "Medium", options: [
      { value: "Highest", label: "Highest" },
      { value: "High",    label: "High" },
      { value: "Medium",  label: "Medium" },
      { value: "Low",     label: "Low" },
      { value: "Lowest",  label: "Lowest" },
    ], show: { operation: ["createIssue"] } },

    { name: "issueKey", label: "Issue Key", type: "string", smart: true, placeholder: "PROJ-123", show: { operation: ["getIssue", "updateIssue", "transitionIssue", "addComment"] } },

    { name: "updateSummary", label: "Summary", type: "string", smart: true, optional: true, show: { operation: ["updateIssue"] } },
    { name: "updateDescription", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["updateIssue"] } },
    { name: "updateAssignee", label: "Assignee", type: "string", smart: true, optional: true, show: { operation: ["updateIssue"] } },
    { name: "updatePriority", label: "Priority", type: "options", cols: 3, default: "Medium", options: [
      { value: "Highest", label: "Highest" },
      { value: "High",    label: "High" },
      { value: "Medium",  label: "Medium" },
      { value: "Low",     label: "Low" },
      { value: "Lowest",  label: "Lowest" },
    ], show: { operation: ["updateIssue"] } },

    { name: "transitionId", label: "Transition ID", type: "string", smart: true, placeholder: "21", show: { operation: ["transitionIssue"] } },

    { name: "jql", label: "JQL Query", type: "string", smart: true, default: "order by created DESC", show: { operation: ["searchIssues"] } },
    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["searchIssues"] } },

    { name: "comment", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["addComment"] } },
  ],
  outputs: ["id", "key", "issues", "projects", "comment"],
};

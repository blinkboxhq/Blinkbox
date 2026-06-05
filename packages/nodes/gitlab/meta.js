export default {
  backendType: "gitlab",
  label: "GitLab",
  description: "Manage GitLab issues, merge requests, and pipelines.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#FC6D26" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createIssue", options: [
      { value: "createIssue",     label: "Create Issue" },
      { value: "getProject",      label: "Get Project" },
      { value: "listIssues",      label: "List Issues" },
      { value: "updateIssue",     label: "Update Issue" },
      { value: "commentIssue",    label: "Comment on Issue" },
      { value: "createMR",        label: "Create MR" },
      { value: "mergeMR",         label: "Merge MR" },
      { value: "triggerPipeline", label: "Trigger Pipeline" },
    ]},

    { name: "projectId", label: "Project ID", type: "string", smart: true, placeholder: "group/project or numeric ID" },

    { name: "issueTitle", label: "Title", type: "string", smart: true, show: { operation: ["createIssue"] } },
    { name: "issueDescription", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIssue"] } },
    { name: "labels", label: "Labels", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["createIssue"] } },
    { name: "assigneeIds", label: "Assignee IDs", type: "string", smart: true, optional: true, hint: "Comma-separated user IDs", show: { operation: ["createIssue"] } },
    { name: "milestoneId", label: "Milestone ID", type: "string", smart: true, optional: true, show: { operation: ["createIssue"] } },

    { name: "issueState", label: "State", type: "options", cols: 3, default: "opened", options: [
      { value: "opened", label: "Opened" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listIssues"] } },
    { name: "issueLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listIssues"] } },

    { name: "issueIid", label: "Issue IID", type: "string", smart: true, placeholder: "Issue IID number", show: { operation: ["updateIssue", "commentIssue"] } },
    { name: "updateTitle", label: "Title", type: "string", smart: true, optional: true, show: { operation: ["updateIssue"] } },
    { name: "updateDescription", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["updateIssue"] } },
    { name: "stateEvent", label: "State Event", type: "options", cols: 2, options: [
      { value: "close",  label: "Close" },
      { value: "reopen", label: "Reopen" },
    ], optional: true, show: { operation: ["updateIssue"] } },

    { name: "commentBody", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["commentIssue"] } },

    { name: "sourceBranch", label: "Source Branch", type: "string", smart: true, show: { operation: ["createMR"] } },
    { name: "targetBranch", label: "Target Branch", type: "string", smart: true, default: "main", show: { operation: ["createMR"] } },
    { name: "mrTitle", label: "Title", type: "string", smart: true, show: { operation: ["createMR"] } },
    { name: "mrDescription", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createMR"] } },
    { name: "removeSourceBranch", label: "Remove Source Branch", type: "boolean", default: true, show: { operation: ["createMR"] } },

    { name: "mrIid", label: "MR IID", type: "string", smart: true, placeholder: "MR IID", show: { operation: ["mergeMR"] } },
    { name: "squash", label: "Squash Commits", type: "boolean", show: { operation: ["mergeMR"] } },
    { name: "deleteSourceBranch", label: "Delete Source Branch", type: "boolean", show: { operation: ["mergeMR"] } },

    { name: "pipelineRef", label: "Ref", type: "string", smart: true, default: "main", show: { operation: ["triggerPipeline"] } },
    { name: "pipelineVariables", label: "Variables", type: "string", smart: true, multiline: true, optional: true, hint: "JSON object: {KEY: value}", show: { operation: ["triggerPipeline"] } },
  ],
  outputs: ["issue", "issues", "project", "mr", "pipeline"],
};

export default {
  backendType: "azure_devops",
  label: "Azure DevOps",
  description: "Manage Azure DevOps work items, pipelines, and pull requests.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#0078D7" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createWorkItem", options: [
      { value: "createWorkItem", label: "Create Work Item" },
      { value: "getWorkItem",    label: "Get Work Item" },
      { value: "updateWorkItem", label: "Update Work Item" },
      { value: "listWorkItems",  label: "List Work Items" },
      { value: "createPR",       label: "Create PR" },
      { value: "getPipeline",    label: "Get Pipeline" },
      { value: "runPipeline",    label: "Run Pipeline" },
      { value: "listProjects",   label: "List Projects" },
    ]},

    { name: "organization", label: "Organization", type: "string", smart: false, placeholder: "your-org" },
    { name: "project", label: "Project", type: "string", smart: true, placeholder: "MyProject", show: { operation: ["createWorkItem", "getWorkItem", "updateWorkItem", "listWorkItems", "createPR", "getPipeline", "runPipeline"] } },

    { name: "workItemType", label: "Work Item Type", type: "options", cols: 3, default: "Task", options: [
      { value: "Bug",        label: "Bug" },
      { value: "Task",       label: "Task" },
      { value: "User Story", label: "User Story" },
      { value: "Feature",    label: "Feature" },
      { value: "Epic",       label: "Epic" },
    ], show: { operation: ["createWorkItem"] } },
    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createWorkItem"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createWorkItem"] } },
    { name: "assignedTo", label: "Assigned To", type: "string", smart: true, optional: true, placeholder: "user@email.com", show: { operation: ["createWorkItem", "updateWorkItem"] } },
    { name: "priority", label: "Priority", type: "options", cols: 2, default: "2", options: [
      { value: "1", label: "1 - Critical" },
      { value: "2", label: "2 - High" },
      { value: "3", label: "3 - Medium" },
      { value: "4", label: "4 - Low" },
    ], show: { operation: ["createWorkItem", "updateWorkItem"] } },

    { name: "workItemId", label: "Work Item ID", type: "string", smart: true, show: { operation: ["getWorkItem", "updateWorkItem"] } },

    { name: "updateTitle", label: "Title", type: "string", smart: true, optional: true, show: { operation: ["updateWorkItem"] } },
    { name: "state", label: "State", type: "string", smart: true, optional: true, placeholder: "Active|Resolved|Closed", show: { operation: ["updateWorkItem"] } },

    { name: "wiql", label: "WIQL Query", type: "string", smart: true, multiline: true, default: "SELECT [Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.CreatedDate] DESC", show: { operation: ["listWorkItems"] } },
    { name: "wiqlLimit", label: "Limit", type: "number", default: 50, show: { operation: ["listWorkItems"] } },

    { name: "repositoryId", label: "Repository", type: "string", smart: true, placeholder: "repo name or ID", show: { operation: ["createPR"] } },
    { name: "sourceRefName", label: "Source Branch", type: "string", smart: true, placeholder: "refs/heads/feature", show: { operation: ["createPR"] } },
    { name: "targetRefName", label: "Target Branch", type: "string", smart: true, default: "refs/heads/main", show: { operation: ["createPR"] } },
    { name: "prTitle", label: "PR Title", type: "string", smart: true, show: { operation: ["createPR"] } },
    { name: "prDescription", label: "PR Description", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createPR"] } },

    { name: "pipelineId", label: "Pipeline ID", type: "string", smart: true, show: { operation: ["getPipeline", "runPipeline"] } },
    { name: "branch", label: "Branch", type: "string", smart: true, default: "main", show: { operation: ["runPipeline"] } },
  ],
  outputs: ["workItem", "workItems", "pr", "pipeline", "projects"],
};

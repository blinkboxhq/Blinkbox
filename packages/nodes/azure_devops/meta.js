export default {
  backendType: "azure_devops",
  label: "Azure DevOps",
  description: "Work items and pipelines in an Azure DevOps project.",
  fields: [
    { name: "credentialId", label: "Azure DevOps Credential", type: "credential", accentColor: "#0078D4" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listWorkItems", options: [
      { value: "listWorkItems",  label: "List Work Items",  desc: "Newest work items in the project" },
      { value: "createWorkItem", label: "Create Work Item", desc: "Open a bug, task or story" },
      { value: "listPipelines",  label: "List Pipelines",   desc: "All pipelines in the project" },
    ]},

    { name: "organization", label: "Organization", type: "string", smart: false, required: true, placeholder: "your-org", hint: "The name in dev.azure.com/<org>." },
    { name: "project", label: "Project", type: "string", smart: true, required: true, placeholder: "MyProject" },

    { name: "limit", label: "Limit", type: "number", default: 20, hint: "Max work items to return.", show: { operation: ["listWorkItems"] } },

    { name: "workItemType", label: "Work Item Type", type: "options", cols: 3, default: "Task", options: [
      { value: "Bug",        label: "Bug" },
      { value: "Task",       label: "Task" },
      { value: "User Story", label: "User Story" },
      { value: "Feature",    label: "Feature" },
      { value: "Epic",       label: "Epic" },
    ], show: { operation: ["createWorkItem"] } },
    { name: "title", label: "Title", type: "string", smart: true, placeholder: "{{ $json.title }}", show: { operation: ["createWorkItem"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, placeholder: "What needs doing…", show: { operation: ["createWorkItem"] } },
  ],
  outputs: ["items", "count", "id", "fields", "url"],
};

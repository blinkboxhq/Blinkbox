export default {
  backendType: "gitlab",
  label: "GitLab",
  description: "Issues, merge requests and pipelines on GitLab.com or a self-hosted instance.",
  fields: [
    { name: "credentialId", label: "GitLab Credential", type: "credential", accentColor: "#FC6D26" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listIssues", options: [
      { value: "listIssues",      label: "List Issues",       desc: "Fetch issues from a project" },
      { value: "createIssue",     label: "Create Issue",      desc: "Open a new issue" },
      { value: "updateIssue",     label: "Update Issue",      desc: "Edit title, labels or state" },
      { value: "commentIssue",    label: "Comment on Issue",  desc: "Add a note to an issue" },
      { value: "createMR",        label: "Create MR",         desc: "Open a merge request" },
      { value: "mergeMR",         label: "Merge MR",          desc: "Merge an open merge request" },
      { value: "triggerPipeline", label: "Trigger Pipeline",  desc: "Run a pipeline on a ref" },
      { value: "getProject",      label: "Get Project",       desc: "Read project metadata" },
    ]},

    { name: "project", label: "Project", type: "string", smart: true, required: true, placeholder: "group/project or 12345", hint: "Project ID, or namespace/name." },
    { name: "baseUrl", label: "Instance URL", type: "string", smart: false, default: "https://gitlab.com", placeholder: "https://gitlab.com", hint: "Change only for self-hosted GitLab." },

    { name: "state", label: "State", type: "options", cols: 3, default: "opened", options: [
      { value: "opened", label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listIssues"] } },
    { name: "limit", label: "Limit", type: "number", default: 20, hint: "Capped at 100 by GitLab.", show: { operation: ["listIssues"] } },

    { name: "issueIid", label: "Issue IID", type: "string", smart: true, placeholder: "{{ $json.iid }}", hint: "The number in the issue URL, not the internal ID.", show: { operation: ["updateIssue", "commentIssue"] } },
    { name: "title", label: "Title", type: "string", smart: true, placeholder: "{{ $json.title }}", show: { operation: ["createIssue", "updateIssue", "createMR"] } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, optional: true, placeholder: "Markdown supported…", show: { operation: ["createIssue", "updateIssue", "createMR"] } },
    { name: "labels", label: "Labels", type: "string", smart: true, optional: true, hint: "Comma-separated.", placeholder: "bug, backend", show: { operation: ["createIssue", "updateIssue"] } },
    { name: "state_event", label: "Change State", type: "options", cols: 3, default: "", options: [
      { value: "",       label: "Leave as is" },
      { value: "close",  label: "Close" },
      { value: "reopen", label: "Reopen" },
    ], show: { operation: ["updateIssue"] } },

    { name: "body", label: "Comment", type: "string", smart: true, multiline: true, placeholder: "Deployed automatically by Blinkbox.", show: { operation: ["commentIssue"] } },

    { name: "sourceBranch", label: "Source Branch", type: "string", smart: true, placeholder: "feature/login", show: { operation: ["createMR"] } },
    { name: "targetBranch", label: "Target Branch", type: "string", smart: true, default: "main", placeholder: "main", show: { operation: ["createMR"] } },

    { name: "mrIid", label: "MR IID", type: "string", smart: true, placeholder: "{{ $json.iid }}", show: { operation: ["mergeMR"] } },

    { name: "ref", label: "Ref", type: "string", smart: true, default: "main", placeholder: "main", hint: "Branch or tag to run the pipeline on.", show: { operation: ["triggerPipeline"] } },
    { name: "variables", label: "Pipeline Variables", type: "keyValue", keyName: "key", valueName: "value", addLabel: "Add variable", optional: true, show: { operation: ["triggerPipeline"] } },
  ],
  outputs: ["id", "iid", "title", "state", "web_url", "items", "count"],
};

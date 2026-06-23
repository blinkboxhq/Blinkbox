export default {
  backendType: "sentry",
  label: "Sentry",
  description: "Manage issues, projects, events, and releases via the Sentry API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#362D59" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listIssues",
      options: [
        { value: "listOrganizations", label: "List Organizations" },
        { value: "listProjects",      label: "List Projects" },
        { value: "createProject",     label: "Create Project" },
        { value: "listIssues",        label: "List Issues" },
        { value: "getIssue",          label: "Get Issue" },
        { value: "updateIssue",       label: "Update Issue" },
        { value: "assignIssue",       label: "Assign Issue" },
        { value: "resolveIssue",      label: "Resolve Issue" },
        { value: "ignoreIssue",       label: "Ignore Issue" },
        { value: "listEvents",        label: "List Events" },
        { value: "captureEvent",      label: "Capture Event" },
        { value: "createRelease",     label: "Create Release" },
      ],
    },

    {
      name: "orgSlug", label: "Organization Slug", type: "string", smart: false, placeholder: "your-org-slug",
      show: { operation: ["listProjects", "createProject", "listIssues", "captureEvent", "createRelease"] },
    },

    { name: "teamSlug", label: "Team Slug", type: "string", smart: true, placeholder: "your-team", show: { operation: ["createProject"] } },
    { name: "projectName", label: "Project Name", type: "string", smart: true, show: { operation: ["createProject"] } },
    { name: "platform", label: "Platform", type: "string", smart: true, optional: true, placeholder: "python|node|react", show: { operation: ["createProject"] } },

    { name: "projectSlug", label: "Project Slug", type: "string", smart: true, show: { operation: ["listIssues"] } },
    { name: "issuesQuery", label: "Query", type: "string", smart: true, optional: true, default: "is:unresolved", show: { operation: ["listIssues"] } },
    { name: "issuesLimit", label: "Limit", type: "number", default: 25, show: { operation: ["listIssues"] } },

    { name: "issueId", label: "Issue ID", type: "string", smart: true, show: { operation: ["getIssue", "updateIssue", "assignIssue", "resolveIssue", "ignoreIssue", "listEvents"] } },

    {
      name: "status", label: "Status", type: "options", cols: 3,
      options: [
        { value: "resolved",   label: "Resolved" },
        { value: "unresolved", label: "Unresolved" },
        { value: "ignored",    label: "Ignored" },
      ],
      show: { operation: ["updateIssue"] },
    },
    { name: "assignedTo", label: "Assigned To", type: "string", smart: true, optional: true, placeholder: "username", show: { operation: ["updateIssue"] } },

    { name: "assignee", label: "Assignee", type: "string", smart: true, placeholder: "username or team name", show: { operation: ["assignIssue"] } },

    { name: "eventsLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listEvents"] } },

    { name: "dsn", label: "DSN", type: "string", smart: true, placeholder: "Sentry DSN URL", show: { operation: ["captureEvent"] } },
    { name: "eventMessage", label: "Message", type: "string", smart: true, show: { operation: ["captureEvent"] } },
    {
      name: "level", label: "Level", type: "options", cols: 2, default: "error",
      options: [
        { value: "error",   label: "Error" },
        { value: "warning", label: "Warning" },
        { value: "info",    label: "Info" },
        { value: "debug",   label: "Debug" },
      ],
      show: { operation: ["captureEvent"] },
    },
    { name: "extra", label: "Extra (JSON)", type: "string", smart: true, multiline: true, optional: true, hint: "JSON object", show: { operation: ["captureEvent"] } },

    { name: "version", label: "Version", type: "string", smart: true, placeholder: "1.0.0", show: { operation: ["createRelease"] } },
    { name: "releaseProjects", label: "Projects", type: "string", smart: true, hint: "Comma-separated project slugs", show: { operation: ["createRelease"] } },
    { name: "releaseUrl", label: "Deploy URL", type: "string", smart: true, optional: true, placeholder: "Deploy URL", show: { operation: ["createRelease"] } },
    { name: "environment", label: "Environment", type: "string", smart: true, optional: true, default: "production", show: { operation: ["createRelease"] } },
  ],
  outputs: ["issues", "issue", "events", "project", "release", "organizations"],
};

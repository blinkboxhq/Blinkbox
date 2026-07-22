export default {
  backendType: "sentry",
  label: "Sentry",
  description: "Manage issues, projects, events, and releases via the Sentry API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#362D59" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listIssues",
      options: [
        { value: "listOrganizations", label: "List Organizations", desc: "List organizations you can access" },
        { value: "listProjects",      label: "List Projects", desc: "List projects in an organization" },
        { value: "createProject",     label: "Create Project", desc: "Create a project under a team" },
        { value: "listIssues",        label: "List Issues", desc: "List issues, filtered by query and state" },
        { value: "getIssue",          label: "Get Issue", desc: "Fetch one issue with its metadata" },
        { value: "updateIssue",       label: "Update Issue", desc: "Change an issue's status or assignee" },
        { value: "assignIssue",       label: "Assign Issue", desc: "Assign an issue to a user or team" },
        { value: "resolveIssue",      label: "Resolve Issue", desc: "Mark an issue as resolved" },
        { value: "ignoreIssue",       label: "Ignore Issue", desc: "Mute an issue so it stops alerting" },
        { value: "listEvents",        label: "List Events", desc: "List raw events for an issue" },
        { value: "captureEvent",      label: "Capture Event", desc: "Send a custom event or error to Sentry" },
        { value: "createRelease",     label: "Create Release", desc: "Register a release for tracking regressions" },
      ],
    },

    {
      name: "org", label: "Organization Slug", type: "string", smart: false, placeholder: "your-org-slug",
      show: { operation: ["listProjects", "createProject", "listIssues", "captureEvent", "createRelease"] },
    },

    { name: "team", label: "Team Slug", type: "string", smart: true, placeholder: "your-team", show: { operation: ["createProject"] } },
    { name: "name", label: "Project Name", type: "string", smart: true, show: { operation: ["createProject"] } },
    { name: "platform", label: "Platform", type: "string", smart: true, optional: true, placeholder: "python|node|react", show: { operation: ["createProject"] } },

    { name: "project", label: "Project Slug", type: "string", smart: true, show: { operation: ["listIssues"] } },
    { name: "query", label: "Query", type: "string", smart: true, optional: true, default: "is:unresolved", show: { operation: ["listIssues"] } },
    { name: "limit", label: "Limit", type: "number", default: 25, show: { operation: ["listIssues"] } },

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

    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["listEvents"] } },

    { name: "dsn", label: "DSN", type: "string", smart: true, placeholder: "Sentry DSN URL", show: { operation: ["captureEvent"] } },
    { name: "message", label: "Message", type: "string", smart: true, show: { operation: ["captureEvent"] } },
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
    { name: "tags", label: "Tags", type: "keyValue", optional: true, show: { operation: ["captureEvent"] } },

    { name: "version", label: "Version", type: "string", smart: true, placeholder: "1.0.0", show: { operation: ["createRelease"] } },
    { name: "projects", label: "Projects", type: "string", smart: true, hint: "Comma-separated project slugs", show: { operation: ["createRelease"] } },
    { name: "url", label: "Deploy URL", type: "string", smart: true, optional: true, placeholder: "Deploy URL", show: { operation: ["createRelease"] } },
    { name: "environment", label: "Environment", type: "string", smart: true, optional: true, default: "production", show: { operation: ["createRelease"] } },
  ],
  outputs: ["issues", "issue", "events", "project", "release", "organizations"],
};

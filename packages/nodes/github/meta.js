export default {
  backendType: "github",
  label: "GitHub",
  description: "Manage GitHub issues, pull requests, releases, and repositories.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#24292E" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createIssue", options: [
      { value: "createIssue",   label: "Create Issue", desc: "Open a new issue on a repository" },
      { value: "getIssue",      label: "Get Issue", desc: "Fetch one issue by number" },
      { value: "listIssues",    label: "List Issues", desc: "List issues, filtered by state and labels" },
      { value: "updateIssue",   label: "Update Issue", desc: "Change an issue's title, body, state or labels" },
      { value: "createPR",      label: "Create PR", desc: "Open a pull request between two branches" },
      { value: "listPRs",       label: "List PRs", desc: "List pull requests by state" },
      { value: "mergePR",       label: "Merge PR", desc: "Merge an open pull request" },
      { value: "createComment", label: "Create Comment", desc: "Post a comment on an issue or pull request" },
      { value: "createRelease", label: "Create Release", desc: "Publish a tagged release" },
      { value: "getRepo",       label: "Get Repo", desc: "Fetch repository details and stats" },
    ]},

    { name: "owner", label: "Owner", type: "string", smart: true, placeholder: "owner or org" },
    { name: "repo", label: "Repository", type: "string", smart: true, placeholder: "repo-name" },

    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "body", label: "Body", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "labels", label: "Labels", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["createIssue", "updateIssue"] } },
    { name: "assignees", label: "Assignees", type: "string", smart: true, optional: true, hint: "Comma-separated usernames", show: { operation: ["createIssue", "updateIssue"] } },

    { name: "issueNumber", label: "Issue Number", type: "string", smart: true, placeholder: "42", show: { operation: ["getIssue", "createComment"] } },

    { name: "state", label: "State", type: "options", cols: 3, default: "open", options: [
      { value: "open",   label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listIssues"] } },
    { name: "limit", label: "Limit", type: "number", default: 30, show: { operation: ["listIssues"] } },

    { name: "title", label: "Title", type: "string", smart: true, show: { operation: ["createPR"] } },
    { name: "body", label: "Body", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createPR"] } },
    { name: "head", label: "Head Branch", type: "string", smart: true, placeholder: "feature-branch", show: { operation: ["createPR"] } },
    { name: "base", label: "Base Branch", type: "string", smart: true, default: "main", show: { operation: ["createPR"] } },
    { name: "draft", label: "Draft", type: "boolean", show: { operation: ["createPR"] } },

    { name: "state", label: "State", type: "options", cols: 3, default: "open", options: [
      { value: "open",   label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listPRs"] } },
    { name: "limit", label: "Limit", type: "number", default: 30, show: { operation: ["listPRs"] } },

    { name: "prNumber", label: "PR Number", type: "string", smart: true, show: { operation: ["mergePR"] } },
    { name: "commitTitle", label: "Commit Title", type: "string", smart: true, optional: true, show: { operation: ["mergePR"] } },
    { name: "mergeMethod", label: "Merge Method", type: "options", cols: 3, default: "merge", options: [
      { value: "merge",  label: "Merge" },
      { value: "squash", label: "Squash" },
      { value: "rebase", label: "Rebase" },
    ], show: { operation: ["mergePR"] } },

    { name: "body", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["createComment"] } },

    { name: "tagName", label: "Tag Name", type: "string", smart: true, placeholder: "v1.0.0", show: { operation: ["createRelease"] } },
    { name: "name", label: "Release Name", type: "string", smart: true, show: { operation: ["createRelease"] } },
    { name: "body", label: "Release Notes", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createRelease"] } },
    { name: "prerelease", label: "Pre-release", type: "boolean", show: { operation: ["createRelease"] } },
    { name: "draft", label: "Draft", type: "boolean", show: { operation: ["createRelease"] } },
  ],
  outputs: ["issue", "issues", "pr", "prs", "release", "repo", "comment"],
};

export default {
  backendType: "github",
  label: "GitHub",
  description: "Manage GitHub issues, pull requests, releases, and repositories.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#24292E" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "createIssue", options: [
      { value: "createIssue",   label: "Create Issue" },
      { value: "getIssue",      label: "Get Issue" },
      { value: "listIssues",    label: "List Issues" },
      { value: "updateIssue",   label: "Update Issue" },
      { value: "createPR",      label: "Create PR" },
      { value: "listPRs",       label: "List PRs" },
      { value: "mergePR",       label: "Merge PR" },
      { value: "createComment", label: "Create Comment" },
      { value: "createRelease", label: "Create Release" },
      { value: "getRepo",       label: "Get Repo" },
    ]},

    { name: "owner", label: "Owner", type: "string", smart: true, placeholder: "owner or org" },
    { name: "repo", label: "Repository", type: "string", smart: true, placeholder: "repo-name" },

    { name: "issueTitle", label: "Title", type: "string", smart: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "issueBody", label: "Body", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createIssue", "updateIssue"] } },
    { name: "labels", label: "Labels", type: "string", smart: true, optional: true, hint: "Comma-separated", show: { operation: ["createIssue", "updateIssue"] } },
    { name: "assignees", label: "Assignees", type: "string", smart: true, optional: true, hint: "Comma-separated usernames", show: { operation: ["createIssue", "updateIssue"] } },

    { name: "issueNumber", label: "Issue Number", type: "string", smart: true, placeholder: "42", show: { operation: ["getIssue", "createComment"] } },

    { name: "issueState", label: "State", type: "options", cols: 3, default: "open", options: [
      { value: "open",   label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listIssues"] } },
    { name: "issueLimit", label: "Limit", type: "number", default: 30, show: { operation: ["listIssues"] } },

    { name: "prTitle", label: "Title", type: "string", smart: true, show: { operation: ["createPR"] } },
    { name: "prBody", label: "Body", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createPR"] } },
    { name: "head", label: "Head Branch", type: "string", smart: true, placeholder: "feature-branch", show: { operation: ["createPR"] } },
    { name: "base", label: "Base Branch", type: "string", smart: true, default: "main", show: { operation: ["createPR"] } },
    { name: "draft", label: "Draft", type: "boolean", show: { operation: ["createPR"] } },

    { name: "prState", label: "State", type: "options", cols: 3, default: "open", options: [
      { value: "open",   label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all",    label: "All" },
    ], show: { operation: ["listPRs"] } },
    { name: "prLimit", label: "Limit", type: "number", default: 30, show: { operation: ["listPRs"] } },

    { name: "prNumber", label: "PR Number", type: "string", smart: true, show: { operation: ["mergePR"] } },
    { name: "commitTitle", label: "Commit Title", type: "string", smart: true, optional: true, show: { operation: ["mergePR"] } },
    { name: "mergeMethod", label: "Merge Method", type: "options", cols: 3, default: "merge", options: [
      { value: "merge",  label: "Merge" },
      { value: "squash", label: "Squash" },
      { value: "rebase", label: "Rebase" },
    ], show: { operation: ["mergePR"] } },

    { name: "commentBody", label: "Comment", type: "string", smart: true, multiline: true, show: { operation: ["createComment"] } },

    { name: "tagName", label: "Tag Name", type: "string", smart: true, placeholder: "v1.0.0", show: { operation: ["createRelease"] } },
    { name: "releaseName", label: "Release Name", type: "string", smart: true, show: { operation: ["createRelease"] } },
    { name: "releaseBody", label: "Release Notes", type: "string", smart: true, multiline: true, optional: true, show: { operation: ["createRelease"] } },
    { name: "prerelease", label: "Pre-release", type: "boolean", show: { operation: ["createRelease"] } },
    { name: "releaseDraft", label: "Draft", type: "boolean", show: { operation: ["createRelease"] } },
  ],
  outputs: ["issue", "issues", "pr", "prs", "release", "repo", "comment"],
};

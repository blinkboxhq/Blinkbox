/**
 * GitHub — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, token)`; the slim entry resolves the
 * PAT and passes it in. NO_REPO_OPS (in GenericFunctions) don't require owner/repo.
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";
import { pullRequestOperations } from "./v1/PullRequestDescription.js";
import { contentOperations } from "./v1/ContentDescription.js";
import { branchOperations } from "./v1/BranchDescription.js";
import { actionsOperations } from "./v1/ActionsDescription.js";
import { repositoryOperations } from "./v1/RepositoryDescription.js";

export const OPERATIONS = {
  ...issueOperations,
  ...pullRequestOperations,
  ...contentOperations,
  ...branchOperations,
  ...actionsOperations,
  ...repositoryOperations,
};

export const DEFAULT_OPERATION = "listIssues";

export const OPERATION_SCHEMA = {
  createIssue: { description: "Open a new issue in a repository", recommended: true },
  getIssue: { description: "Read one issue by number, including its body" },
  listIssues: { description: "List a repository's issues, filterable by state and labels", recommended: true },
  updateIssue: { description: "Edit an issue's title, body, state, assignees or labels" },
  closeIssue: { description: "Close an issue" },
  addLabels: { description: "Add labels to an issue or PR" },
  createComment: { description: "Comment on an issue or pull request", recommended: true },
  listComments: { description: "List the comments on an issue or PR" },
  createPR: { description: "Open a pull request between two branches", recommended: true },
  getPR: { description: "Read one pull request, including its merge status" },
  listPRs: { description: "List a repository's pull requests" },
  updatePR: { description: "Edit a pull request's title, body, base or state" },
  mergePR: { description: "Merge a pull request (merge, squash or rebase)" },
  listPRFiles: { description: "List the files changed in a pull request" },
  requestReviewers: { description: "Request reviewers on a pull request" },
  createReview: { description: "Submit a PR review — approve, request changes or comment" },
  createFile: { description: "Create or update a file with a commit" },
  getFile: { description: "Read a file's content from a repository" },
  deleteFile: { description: "Delete a file with a commit" },
  listBranches: { description: "List a repository's branches" },
  getBranch: { description: "Read one branch, including its head commit" },
  createBranch: { description: "Create a branch from another branch or commit" },
  listCommits: { description: "List commits, filterable by branch, path or author" },
  getCommit: { description: "Read one commit, including its file diff" },
  createRelease: { description: "Publish a release from a tag" },
  listReleases: { description: "List a repository's releases" },
  getLatestRelease: { description: "Read the latest published release" },
  listWorkflowRuns: { description: "List GitHub Actions runs for a workflow or repo" },
  dispatchWorkflow: { description: "Trigger a GitHub Actions workflow_dispatch run" },
  getRepo: { description: "Read a repository's metadata" },
  listMyRepos: { description: "List repositories the authenticated user can access" },
  createRepo: { description: "Create a new repository" },
  getUser: { description: "Read a user's public profile" },
  getAuthenticatedUser: { description: "Read the profile behind the current token" },
  searchIssues: { description: "Search issues and PRs with GitHub query syntax", recommended: true },
  searchRepos: { description: "Search repositories with GitHub query syntax" },
  searchCode: { description: "Search file contents across repositories" },
};

export async function run(config, token) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `GitHub: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

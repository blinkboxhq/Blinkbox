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

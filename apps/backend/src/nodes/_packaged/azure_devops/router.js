/**
 * Azure DevOps — operation router. Merges every v1 resource map into one
 * dispatch table. Every handler is called `(config, ctx)`; the slim entry
 * resolves the PAT, builds the `ctx` requester via makeReq, and passes it in.
 */
import { handleError } from "./GenericFunctions.js";
import { workItemOperations } from "./v1/WorkItemDescription.js";
import { pullRequestOperations } from "./v1/PullRequestDescription.js";
import { repositoryOperations } from "./v1/RepositoryDescription.js";
import { pipelineOperations } from "./v1/PipelineDescription.js";
import { buildOperations } from "./v1/BuildDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";

export const OPERATIONS = {
  ...workItemOperations,
  ...pullRequestOperations,
  ...repositoryOperations,
  ...pipelineOperations,
  ...buildOperations,
  ...projectOperations,
};

export const DEFAULT_OPERATION = "createWorkItem";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Azure DevOps: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

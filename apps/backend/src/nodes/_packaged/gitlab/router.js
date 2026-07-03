/**
 * GITLAB — operation router. Spreads the issue / merge-request / pipeline /
 * repository operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError.
 *
 * THROW-on-unknown family (double-quoted, with a Valid: list), matching the
 * monolith's default branch — the list is now the live OPERATIONS keys.
 * DEFAULT_OPERATION is `listIssues`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";
import { mergeRequestOperations } from "./v1/MergeRequestDescription.js";
import { pipelineOperations } from "./v1/PipelineDescription.js";
import { repositoryOperations } from "./v1/RepositoryDescription.js";

export const OPERATIONS = {
  ...issueOperations,
  ...mergeRequestOperations,
  ...pipelineOperations,
  ...repositoryOperations,
};

export const DEFAULT_OPERATION = "listIssues";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) {
    throw new Error(`gitlab: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}.`);
  }
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

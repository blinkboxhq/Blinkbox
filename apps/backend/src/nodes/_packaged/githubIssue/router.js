/**
 * GITHUB ISSUE — operation router. Spreads the issue map into one OPERATIONS
 * registry. THROW-on-unknown, double-quoted, matching the monolith.
 * DEFAULT_OPERATION is `create`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";

export const OPERATIONS = {
  ...issueOperations,
};

export const DEFAULT_OPERATION = "create";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`github_issue: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

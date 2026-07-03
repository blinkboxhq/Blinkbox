/**
 * AZURE DEVOPS — operation router. Spreads the work-item and pipeline/repo maps
 * into one OPERATIONS registry. THROW-on-unknown, double-quoted, matching the
 * monolith. DEFAULT_OPERATION is `listWorkItems`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { workItemOperations } from "./v1/WorkItemDescription.js";
import { pipelineOperations } from "./v1/PipelineDescription.js";

export const OPERATIONS = {
  ...workItemOperations,
  ...pipelineOperations,
};

export const DEFAULT_OPERATION = "listWorkItems";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`azure_devops: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

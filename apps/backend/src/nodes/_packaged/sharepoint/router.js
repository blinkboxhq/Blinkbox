/**
 * SHAREPOINT — operation router. Spreads the file/folder and site/list operation
 * maps into a single OPERATIONS registry, then dispatches `run(config, ctx)` →
 * handler, funneling errors to handleError. This node is SKIP-family: an unknown
 * operation returns a skip object (the monolith did NOT throw), matching the
 * original contract exactly. ctx is { headers, siteId, input }.
 */
import { handleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";
import { siteOperations } from "./v1/SiteDescription.js";

export const OPERATIONS = {
  ...fileOperations,
  ...siteOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export function unknownOperationSkip(operation) {
  return { success: false, error: `SharePoint: Unknown operation "${operation}".`, skipped: true };
}

export async function run(config, ctx) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) return unknownOperationSkip(operation);
  try {
    return await handler(config, ctx);
  } catch (err) {
    handleError(err);
  }
}

/**
 * SFTP — operation router. Spreads the file/directory operation map into a
 * single OPERATIONS registry, then dispatches `run(config, ctx)` → handler. This
 * node is SKIP-family: an unknown operation returns a skip object (the monolith
 * did NOT throw), matching the original contract exactly. The connect/end
 * lifecycle is owned by the slim entry; ctx is { sftp, remotePath, input }.
 */
import { fileOperations } from "./v1/FileDescription.js";
import { unknownOperationSkip } from "./GenericFunctions.js";

export const OPERATIONS = {
  ...fileOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export async function run(config, ctx) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) return unknownOperationSkip(operation);
  return handler(config, ctx);
}

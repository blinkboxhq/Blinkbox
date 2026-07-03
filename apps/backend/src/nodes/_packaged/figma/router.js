/**
 * FIGMA — file-operation router (prefix `figma:`). THROW-on-unknown,
 * double-quoted. DEFAULT_OPERATION is `getFile`. Handlers receive
 * (config, client) where config carries a resolved `fileKey`.
 */
import { makeHandleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";

export const OPERATIONS = { ...fileOperations };
export const DEFAULT_OPERATION = "getFile";

const handleError = makeHandleError("figma:");

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`figma: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

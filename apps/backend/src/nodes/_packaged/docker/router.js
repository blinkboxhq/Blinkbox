/**
 * DOCKER — operation router. Spreads the container and image/system maps into one
 * OPERATIONS registry. THROW-on-unknown, double-quoted, matching the monolith.
 * DEFAULT_OPERATION is `listContainers`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { containerOperations } from "./v1/ContainerDescription.js";
import { imageOperations } from "./v1/ImageDescription.js";

export const OPERATIONS = {
  ...containerOperations,
  ...imageOperations,
};

export const DEFAULT_OPERATION = "listContainers";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`docker: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

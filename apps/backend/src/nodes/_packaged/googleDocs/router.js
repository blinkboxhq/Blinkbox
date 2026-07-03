/**
 * GOOGLE DOCS — operation router. Spreads the document map into one OPERATIONS
 * registry. THROW-on-unknown, double-quoted, matching the monolith.
 * DEFAULT_OPERATION is `read`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { documentOperations } from "./v1/DocumentDescription.js";

export const OPERATIONS = {
  ...documentOperations,
};

export const DEFAULT_OPERATION = "read";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`google_docs: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

/**
 * GOOGLE FORMS — operation router. Spreads the form map into one OPERATIONS
 * registry. THROW-on-unknown, double-quoted, matching the monolith.
 * DEFAULT_OPERATION is `getResponses`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { formOperations } from "./v1/FormDescription.js";

export const OPERATIONS = {
  ...formOperations,
};

export const DEFAULT_OPERATION = "getResponses";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`google_forms: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

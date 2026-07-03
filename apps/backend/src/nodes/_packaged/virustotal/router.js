/**
 * VIRUSTOTAL — operation router. Spreads the scan/report map into one OPERATIONS
 * registry. THROW-on-unknown, double-quoted, matching the monolith.
 * DEFAULT_OPERATION is `scanUrl`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { scanOperations } from "./v1/ScanDescription.js";

export const OPERATIONS = {
  ...scanOperations,
};

export const DEFAULT_OPERATION = "scanUrl";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`virustotal: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

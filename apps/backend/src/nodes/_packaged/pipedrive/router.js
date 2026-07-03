/**
 * Pipedrive — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { dealOperations } from "./v1/DealDescription.js";
import { personOperations } from "./v1/PersonDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...dealOperations,
  ...personOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "createDeal";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Pipedrive: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

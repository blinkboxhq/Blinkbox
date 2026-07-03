/**
 * Trello — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { cardOperations } from "./v1/CardDescription.js";
import { boardOperations } from "./v1/BoardDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...cardOperations,
  ...boardOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "createCard";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Trello: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

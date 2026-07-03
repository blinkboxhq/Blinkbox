/**
 * Monday.com — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { boardOperations } from "./v1/BoardDescription.js";
import { itemOperations } from "./v1/ItemDescription.js";
import { accountOperations } from "./v1/AccountDescription.js";

export const OPERATIONS = {
  ...boardOperations,
  ...itemOperations,
  ...accountOperations,
};

export const DEFAULT_OPERATION = "createItem";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Monday: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

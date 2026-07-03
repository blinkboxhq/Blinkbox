/**
 * Asana — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { taskOperations } from "./v1/TaskDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";
import { accountOperations } from "./v1/AccountDescription.js";

export const OPERATIONS = {
  ...taskOperations,
  ...projectOperations,
  ...accountOperations,
};

export const DEFAULT_OPERATION = "createTask";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Asana: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

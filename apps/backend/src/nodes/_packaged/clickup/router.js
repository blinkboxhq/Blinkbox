/**
 * ClickUp — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { taskOperations } from "./v1/TaskDescription.js";
import { structureOperations } from "./v1/StructureDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...taskOperations,
  ...structureOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "createTask";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`ClickUp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

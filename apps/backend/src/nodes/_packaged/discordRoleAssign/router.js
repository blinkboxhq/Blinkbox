/**
 * DISCORD ROLE ASSIGN — operation router. Spreads the role map into one OPERATIONS
 * registry. THROW-on-unknown, double-quoted, matching the monolith (which appends
 * "Use: add, remove"). DEFAULT_OPERATION is `add`. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { roleOperations } from "./v1/RoleDescription.js";

export const OPERATIONS = {
  ...roleOperations,
};

export const DEFAULT_OPERATION = "add";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`discord_role_assign: Unknown operation "${operation}". Use: add, remove`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

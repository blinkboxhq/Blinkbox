/**
 * TYPEFORM — operation router. Spreads the form and response operation maps
 * into a single OPERATIONS registry, then dispatches `run(config, client)` →
 * handler, funneling errors to handleError. Throws on unknown op with the
 * original double-quoted message text. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { formOperations } from "./v1/FormDescription.js";
import { responseOperations } from "./v1/ResponseDescription.js";

export const OPERATIONS = {
  ...formOperations,
  ...responseOperations,
};

export const DEFAULT_OPERATION = "listResponses";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Typeform: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

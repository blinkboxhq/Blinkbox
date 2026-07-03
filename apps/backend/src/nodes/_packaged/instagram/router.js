/**
 * Instagram — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, token)` → handler,
 * funneling errors to handleError. Handlers receive the raw access token.
 */
import { handleError } from "./GenericFunctions.js";
import { mediaOperations } from "./v1/MediaDescription.js";
import { accountOperations } from "./v1/AccountDescription.js";

export const OPERATIONS = {
  ...mediaOperations,
  ...accountOperations,
};

export const DEFAULT_OPERATION = "getUserMedia";

export async function run(config, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`Instagram: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

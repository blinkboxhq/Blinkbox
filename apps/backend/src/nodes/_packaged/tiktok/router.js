/**
 * TikTok — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, token)` → handler,
 * funneling errors to handleError. Handlers receive the raw access token.
 */
import { handleError } from "./GenericFunctions.js";
import { postOperations } from "./v1/PostDescription.js";
import { userOperations } from "./v1/UserDescription.js";

export const OPERATIONS = {
  ...postOperations,
  ...userOperations,
};

export const DEFAULT_OPERATION = "publishVideo";

export async function run(config, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`TikTok: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

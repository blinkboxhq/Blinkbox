/**
 * PINECONE — operation router. Spreads the vector (data-plane) and index
 * (control-plane) operation maps into a single OPERATIONS registry, then
 * dispatches `run(config, apiKey)` → handler, funneling errors to handleError.
 * Throws on unknown op (the monolith threw, listing valid ops), with the
 * original double-quoted message text. Handlers receive (config, apiKey).
 */
import { handleError } from "./GenericFunctions.js";
import { vectorOperations } from "./v1/VectorDescription.js";
import { indexOperations } from "./v1/IndexDescription.js";

export const OPERATIONS = {
  ...vectorOperations,
  ...indexOperations,
};

export const DEFAULT_OPERATION = "query";

export function unknownOperationError(operation) {
  return new Error(`Pinecone: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
}

export async function run(config, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw unknownOperationError(operation);
  try {
    return await handler(config, apiKey);
  } catch (err) {
    handleError(err);
  }
}

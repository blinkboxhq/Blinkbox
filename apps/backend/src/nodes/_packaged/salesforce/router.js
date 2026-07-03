/**
 * SALESFORCE — operation router. Spreads the record / query / metadata
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError. Throws on
 * unknown op (the monolith's switch default threw).
 */
import { handleError } from "./GenericFunctions.js";
import { recordOperations } from "./v1/RecordDescription.js";
import { queryOperations } from "./v1/QueryDescription.js";
import { metadataOperations } from "./v1/MetadataDescription.js";

export const OPERATIONS = {
  ...recordOperations,
  ...queryOperations,
  ...metadataOperations,
};

export const DEFAULT_OPERATION = "queryRecords";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Salesforce: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

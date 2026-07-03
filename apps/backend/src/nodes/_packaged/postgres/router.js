/**
 * POSTGRES — operation router. Spreads the query/execute and batch/schema
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError.
 *
 * FALL-THROUGH family (not throw-on-unknown): the monolith had no `default`
 * branch — any operation that isn't `batch`/`execute` ran the plain row query.
 * That is preserved here: an unmapped operation falls back to the `query`
 * handler rather than throwing. Handlers receive (config, client).
 */
import { handleError } from "./GenericFunctions.js";
import { queryOperations } from "./v1/QueryDescription.js";
import { batchOperations } from "./v1/BatchDescription.js";

export const OPERATIONS = {
  ...queryOperations,
  ...batchOperations,
};

export const DEFAULT_OPERATION = "query";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation] || OPERATIONS.query;
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

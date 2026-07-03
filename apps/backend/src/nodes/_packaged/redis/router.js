/**
 * REDIS — operation router. Spreads the String/Numeric/Key, List/Set/SortedSet
 * and Hash/PubSub operation maps into a single OPERATIONS registry, then
 * dispatches `run(config, redis)` → handler, funneling errors to handleError.
 * THROW-family: an unknown operation throws (single-quoted, verbatim from the
 * monolith's switch default) — the slim entry still SKIPS on missing/failed
 * credentials.
 */
import { handleError } from "./GenericFunctions.js";
import { stringOperations } from "./v1/StringDescription.js";
import { collectionOperations } from "./v1/CollectionDescription.js";
import { hashPubOperations } from "./v1/HashPubDescription.js";

export const OPERATIONS = {
  ...stringOperations,
  ...collectionOperations,
  ...hashPubOperations,
};

export const DEFAULT_OPERATION = "get";

export async function run(config, redis) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) {
    throw new Error(`Redis: Unknown operation '${operation}'.`);
  }
  try {
    return await handler(config, redis);
  } catch (err) {
    handleError(err);
  }
}

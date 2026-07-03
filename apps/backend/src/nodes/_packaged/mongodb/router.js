/**
 * MONGODB — operation router. Spreads the query/read and write/index operation
 * maps into a single OPERATIONS registry, then dispatches `run(config, conn)` →
 * handler, funneling errors to handleError. THROW-family: an unknown operation
 * throws (single-quoted, verbatim from the monolith's switch default).
 *
 * The monolith pre-parsed filter/projection/sort/update at the top of its try —
 * so a malformed JSON in ANY of those throws for EVERY op, even ops that don't
 * use them. That behavior is preserved here: the four are parsed before dispatch
 * and passed to handlers via ctx { conn, col, collection, filterDoc,
 * projectionDoc, sortDoc, updateDoc }.
 */
import { handleError, parseJson } from "./GenericFunctions.js";
import { queryOperations } from "./v1/QueryDescription.js";
import { writeOperations } from "./v1/WriteDescription.js";

export const OPERATIONS = {
  ...queryOperations,
  ...writeOperations,
};

export const DEFAULT_OPERATION = "find";

export async function run(config, conn) {
  const operation = config.operation || DEFAULT_OPERATION;
  const collection = config.collection;
  const col = conn.collection(collection);

  const handler = OPERATIONS[operation];

  try {
    const filterDoc     = parseJson(config.filter, "filter");
    const projectionDoc = parseJson(config.projection, "projection");
    const sortDoc       = parseJson(config.sort, "sort");
    const updateDoc     = parseJson(config.update, "update");

    if (!handler) {
      throw new Error(`MongoDB: Unknown operation '${operation}'.`);
    }

    return await handler(config, { conn, col, collection, filterDoc, projectionDoc, sortDoc, updateDoc });
  } catch (err) {
    handleError(err);
  }
}

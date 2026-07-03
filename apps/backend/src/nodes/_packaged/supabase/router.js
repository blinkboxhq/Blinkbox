/**
 * SUPABASE — operation router. Spreads the table / rpc+auth / storage operation
 * maps into a single OPERATIONS registry, then dispatches `run(config, supabase)`
 * → handler, funneling errors to handleError. Throws on unknown op (the
 * monolith's final throw), with the original single-quoted message text.
 * Handlers receive (config, supabase).
 */
import { handleError } from "./GenericFunctions.js";
import { tableOperations } from "./v1/TableDescription.js";
import { rpcAuthOperations } from "./v1/RpcAuthDescription.js";
import { storageOperations } from "./v1/StorageDescription.js";

export const OPERATIONS = {
  ...tableOperations,
  ...rpcAuthOperations,
  ...storageOperations,
};

export const DEFAULT_OPERATION = "select";

export async function run(config, supabase) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Supabase: Unknown operation '${operation}'.`);
  try {
    return await handler(config, supabase);
  } catch (err) {
    handleError(err);
  }
}

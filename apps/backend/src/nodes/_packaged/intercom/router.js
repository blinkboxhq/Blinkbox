/**
 * INTERCOM — operation router. Spreads the contact / conversation / tag
 * operation maps into a single OPERATIONS registry, applies the legacy op-name
 * aliases, then dispatches `run(config, { api })` → handler, funneling errors
 * to handleError. Throws on unknown op (the monolith's default branch threw,
 * so the slim entry rethrows too rather than skipping).
 */
import { handleError, OP_ALIAS } from "./GenericFunctions.js";
import { contactOperations } from "./v1/ContactDescription.js";
import { conversationOperations } from "./v1/ConversationDescription.js";
import { tagOperations } from "./v1/TagDescription.js";

export const OPERATIONS = {
  ...contactOperations,
  ...conversationOperations,
  ...tagOperations,
};

export const DEFAULT_OPERATION = "createContact";

/** Resolve an incoming op name through the alias table. */
export function resolveOp(operation) {
  const op = operation || DEFAULT_OPERATION;
  return OP_ALIAS[op] || op;
}

export async function run(config, deps) {
  const operation = resolveOp(config.operation);
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Intercom: Unknown operation "${config.operation}".`);
  try {
    return await handler(config, deps);
  } catch (err) {
    handleError(err);
  }
}

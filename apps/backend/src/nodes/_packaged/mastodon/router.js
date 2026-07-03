/**
 * Mastodon — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client, input)` →
 * handler, funneling errors to handleError. The client is { headers, base }.
 * Throws on unknown op, matching the original node's contract.
 */
import { handleError } from "./GenericFunctions.js";
import { statusOperations } from "./v1/StatusDescription.js";
import { accountOperations } from "./v1/AccountDescription.js";
import { timelineOperations } from "./v1/TimelineDescription.js";

export const OPERATIONS = {
  ...statusOperations,
  ...accountOperations,
  ...timelineOperations,
};

export const DEFAULT_OPERATION = "postStatus";

export async function run(config, client, input) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`mastodon: Unknown operation "${operation}".`);
  try {
    return await handler(config, client, input);
  } catch (err) {
    handleError(err);
  }
}

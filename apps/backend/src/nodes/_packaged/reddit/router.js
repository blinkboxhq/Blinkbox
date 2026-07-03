/**
 * Reddit — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError. The client is { headers } built from a
 * short-lived app-only bearer token. Throws on unknown op (the slim entry
 * skips instead, preserving the monolith's UX).
 */
import { handleError } from "./GenericFunctions.js";
import { postOperations } from "./v1/PostDescription.js";
import { commentOperations } from "./v1/CommentDescription.js";
import { subredditOperations } from "./v1/SubredditDescription.js";

export const OPERATIONS = {
  ...postOperations,
  ...commentOperations,
  ...subredditOperations,
};

export const DEFAULT_OPERATION = "listPosts";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`Reddit: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

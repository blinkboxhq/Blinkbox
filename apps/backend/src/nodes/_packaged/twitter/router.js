/**
 * Twitter / X — operation router. Spreads every resource's operations map into
 * a single OPERATIONS registry, then dispatches `run(config, client)` →
 * handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { tweetOperations } from "./v1/TweetDescription.js";
import { userOperations } from "./v1/UserDescription.js";

export const OPERATIONS = {
  ...tweetOperations,
  ...userOperations,
};

export const DEFAULT_OPERATION = "postTweet";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Twitter: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

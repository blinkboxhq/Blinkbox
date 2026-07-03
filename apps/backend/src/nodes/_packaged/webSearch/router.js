/**
 * WEB SEARCH (Tavily) — operation router. The monolith was a single-op node
 * (Tavily /search); this splits it into a small op registry (search, qnaSearch,
 * searchContext, extract) while keeping `search` as the default so legacy configs
 * with no `operation` still route to it. THROW-family: an unknown operation
 * throws (single-quoted). Handlers receive (config, ctx) where ctx is { apiKey }.
 */
import { handleError } from "./GenericFunctions.js";
import { searchOperations } from "./v1/SearchDescription.js";

export const OPERATIONS = {
  ...searchOperations,
};

export const DEFAULT_OPERATION = "search";

export async function run(config, ctx) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) {
    throw new Error(`Web Search: Unknown operation '${operation}'.`);
  }
  try {
    return await handler(config, ctx);
  } catch (err) {
    handleError(err);
  }
}

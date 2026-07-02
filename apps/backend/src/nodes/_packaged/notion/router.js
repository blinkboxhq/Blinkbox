/**
 * Notion — operation router. Merges every v1 resource map into one dispatch
 * table; handlers are called `(config, token)` exactly as the monolith did.
 */
import { handleError } from "./GenericFunctions.js";
import { pageOperations } from "./v1/PageDescription.js";
import { databaseOperations } from "./v1/DatabaseDescription.js";
import { blockOperations } from "./v1/BlockDescription.js";
import { searchOperations } from "./v1/SearchDescription.js";
import { userOperations } from "./v1/UserDescription.js";
import { commentOperations } from "./v1/CommentDescription.js";

export const OPERATIONS = {
  ...pageOperations,
  ...databaseOperations,
  ...blockOperations,
  ...searchOperations,
  ...userOperations,
  ...commentOperations,
};

export const DEFAULT_OPERATION = "createPage";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Notion: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

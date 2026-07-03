/**
 * FIGMA — comment router (prefix `figma_comment:`). Keyed on `mode` to match the
 * monolith. THROW-on-unknown, double-quoted `Unknown mode`. DEFAULT_MODE is
 * `post`. Handlers receive (config, client) where config carries a resolved
 * `fileKey`.
 */
import { makeHandleError } from "./GenericFunctions.js";
import { commentOperations } from "./v1/CommentDescription.js";

export const OPERATIONS = { ...commentOperations };
export const DEFAULT_MODE = "post";

const handleError = makeHandleError("figma_comment:");

export async function run(config, client) {
  const mode = config.mode || DEFAULT_MODE;
  const handler = OPERATIONS[mode];
  if (!handler) throw new Error(`figma_comment: Unknown mode "${mode}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    return handleError(err);
  }
}

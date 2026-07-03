/**
 * YouTube — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, token)` → handler,
 * funneling errors to handleError. Handlers receive the raw OAuth access token.
 *
 * Legacy aliases (getComments → listComments) are preserved so pre-refactor
 * automations keep resolving.
 */
import { handleError } from "./GenericFunctions.js";
import { videoOperations } from "./v1/VideoDescription.js";
import { playlistOperations } from "./v1/PlaylistDescription.js";
import { channelOperations } from "./v1/ChannelDescription.js";
import { commentOperations } from "./v1/CommentDescription.js";

const LEGACY_ALIASES = {
  getComments: commentOperations.listComments,
};

export const OPERATIONS = {
  ...videoOperations,
  ...playlistOperations,
  ...channelOperations,
  ...commentOperations,
  ...LEGACY_ALIASES,
};

export const DEFAULT_OPERATION = "uploadVideo";

export async function run(config, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`YouTube: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

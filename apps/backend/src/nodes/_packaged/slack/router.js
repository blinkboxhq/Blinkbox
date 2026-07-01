/**
 * Slack — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, token)`; the slim entry resolves the
 * Bot Token and passes it (via makeReq) through unchanged.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { fileOperations } from "./v1/FileDescription.js";
import { channelOperations } from "./v1/ChannelDescription.js";
import { userOperations } from "./v1/UserDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...fileOperations,
  ...channelOperations,
  ...userOperations,
};

export const DEFAULT_OPERATION = "postMessage";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Slack: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

/**
 * Telegram — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, token)` where
 * `token` is the Bot Token string resolved by the backend entry.
 */
import { handleError } from "./GenericFunctions.js";
import { messagingOperations } from "./v1/MessagingDescription.js";
import { mediaOperations } from "./v1/MediaDescription.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { adminOperations } from "./v1/AdminDescription.js";

export const OPERATIONS = {
  ...messagingOperations,
  ...mediaOperations,
  ...chatOperations,
  ...adminOperations,
};

export const DEFAULT_OPERATION = "sendMessage";

export async function run(config, token) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Telegram: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

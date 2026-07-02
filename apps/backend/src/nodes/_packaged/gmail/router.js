/**
 * Gmail — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, token)`; the slim entry resolves
 * the Google OAuth2 access token and passes it in.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { draftOperations } from "./v1/DraftDescription.js";
import { labelOperations } from "./v1/LabelDescription.js";
import { threadOperations } from "./v1/ThreadDescription.js";
import { profileOperations } from "./v1/ProfileDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...draftOperations,
  ...labelOperations,
  ...threadOperations,
  ...profileOperations,
};

export const DEFAULT_OPERATION = "sendEmail";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Gmail: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

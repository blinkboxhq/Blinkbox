/**
 * Twilio — operation router. Merges every v1 resource map into one dispatch
 * table; handlers are called `(config, { accountSid, authToken })` exactly as
 * the monolith did.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { callOperations } from "./v1/CallDescription.js";
import { verifyOperations } from "./v1/VerifyDescription.js";
import { numberOperations } from "./v1/NumberDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...callOperations,
  ...verifyOperations,
  ...numberOperations,
};

export const DEFAULT_OPERATION = "sendSms";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Twilio: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

/**
 * Google Calendar — operation router. Merges every v1 resource map into one
 * dispatch table; handlers are called `(config, token, context)` exactly as
 * the monolith did (context is unused today but preserved).
 */
import { handleError } from "./GenericFunctions.js";
import { eventOperations } from "./v1/EventDescription.js";
import { calendarOperations } from "./v1/CalendarDescription.js";
import { aclOperations } from "./v1/AclDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...eventOperations,
  ...calendarOperations,
  ...aclOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "listEvents";

export async function run(config, req, context = {}) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Google Calendar: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req, context);
  } catch (err) {
    handleError(err);
  }
}

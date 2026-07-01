/**
 * Calendly — action router.
 * Merges every v1 *Description operation map into one OPERATIONS table and
 * dispatches on config.operation. Credentials/auth live in the backend entry
 * (apps/backend/.../calendly.node.js), which passes an authenticated `api` in.
 */
import { handleError } from "./GenericFunctions.js";
import { userOperations } from "./v1/UserDescription.js";
import { eventTypeOperations } from "./v1/EventTypeDescription.js";
import { eventOperations } from "./v1/EventDescription.js";
import { availabilityOperations } from "./v1/AvailabilityDescription.js";
import { webhookOperations } from "./v1/WebhookDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...userOperations,
  ...eventTypeOperations,
  ...eventOperations,
  ...availabilityOperations,
  ...webhookOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "listEvents";

export async function run(config, { api }) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Calendly: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, { api });
  } catch (err) {
    handleError(err);
  }
}

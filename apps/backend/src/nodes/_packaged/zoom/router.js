/**
 * ZOOM — operation router. Spreads the meeting and account (recording/webinar/
 * user) operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, token)` → handler, funneling errors to handleError. Throws on
 * unknown op (the monolith threw, listing valid ops), with the original
 * double-quoted message text. Handlers receive (config, token).
 */
import { handleError } from "./GenericFunctions.js";
import { meetingOperations } from "./v1/MeetingDescription.js";
import { accountOperations } from "./v1/AccountDescription.js";

export const OPERATIONS = {
  ...meetingOperations,
  ...accountOperations,
};

export const DEFAULT_OPERATION = "createMeeting";

export function unknownOperationError(operation) {
  return new Error(`Zoom: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
}

export async function run(config, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw unknownOperationError(operation);
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

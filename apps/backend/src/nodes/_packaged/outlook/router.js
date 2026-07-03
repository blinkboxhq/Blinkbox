/**
 * OUTLOOK — operation router. Spreads the message / calendar / contact /
 * folder operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError. Throws
 * on unknown op internally; the slim entry translates missing-op /
 * missing-credential / cred-resolution failures into skip objects and
 * resolves the OAuth token before calling run.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { calendarOperations } from "./v1/CalendarDescription.js";
import { contactOperations } from "./v1/ContactDescription.js";
import { folderOperations } from "./v1/FolderDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...calendarOperations,
  ...contactOperations,
  ...folderOperations,
};

export const DEFAULT_OPERATION = "sendEmail";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Outlook: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

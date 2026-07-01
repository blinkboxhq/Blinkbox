/**
 * Zendesk — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, { api })` where
 * `api` is the axios instance built by the backend entry with the resolved
 * email + API token.
 */
import { handleError } from "./GenericFunctions.js";
import { ticketOperations } from "./v1/TicketDescription.js";
import { userOperations } from "./v1/UserDescription.js";
import { organizationOperations } from "./v1/OrganizationDescription.js";
import { groupOperations } from "./v1/GroupDescription.js";
import { businessRulesOperations } from "./v1/BusinessRulesDescription.js";
import { searchOperations } from "./v1/SearchDescription.js";
import { helpCenterOperations } from "./v1/HelpCenterDescription.js";

export const OPERATIONS = {
  ...ticketOperations,
  ...userOperations,
  ...organizationOperations,
  ...groupOperations,
  ...businessRulesOperations,
  ...searchOperations,
  ...helpCenterOperations,
};

export const DEFAULT_OPERATION = "listTickets";

export async function run(config, requester) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Zendesk: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, requester);
  } catch (err) {
    handleError(err);
  }
}

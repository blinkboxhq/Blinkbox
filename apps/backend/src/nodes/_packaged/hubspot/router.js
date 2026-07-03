/**
 * HubSpot — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, { api })` → handler,
 * funneling errors to handleError. Throws on unknown op internally; the slim
 * entry translates missing-op / missing-credential into skip objects.
 */
import { handleError } from "./GenericFunctions.js";
import { contactOperations } from "./v1/ContactDescription.js";
import { companyOperations } from "./v1/CompanyDescription.js";
import { dealOperations } from "./v1/DealDescription.js";
import { ticketOperations } from "./v1/TicketDescription.js";
import { productOperations } from "./v1/ProductDescription.js";
import { engagementOperations } from "./v1/EngagementDescription.js";
import { metaOperations } from "./v1/MetaDescription.js";

export const OPERATIONS = {
  ...contactOperations,
  ...companyOperations,
  ...dealOperations,
  ...ticketOperations,
  ...productOperations,
  ...engagementOperations,
  ...metaOperations,
};

export const DEFAULT_OPERATION = "createContact";

export async function run(config, deps) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`HubSpot: Unknown operation "${operation}".`);
  try {
    return await handler(config, deps);
  } catch (err) {
    handleError(err);
  }
}

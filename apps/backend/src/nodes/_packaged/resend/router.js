/**
 * RESEND — operation router. Spreads the email, domain/api-key and audience
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, apiKey)` → handler, funneling errors to handleError. Throws on
 * unknown op with the original double-quoted message text that lists valid ops.
 * Handlers receive (config, apiKey).
 */
import { handleError } from "./GenericFunctions.js";
import { emailOperations } from "./v1/EmailDescription.js";
import { domainOperations } from "./v1/DomainDescription.js";
import { audienceOperations } from "./v1/AudienceDescription.js";

export const OPERATIONS = {
  ...emailOperations,
  ...domainOperations,
  ...audienceOperations,
};

export const DEFAULT_OPERATION = "sendEmail";

export function unknownOperationError(operation) {
  return new Error(`Resend: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
}

export async function run(config, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw unknownOperationError(operation);
  try {
    return await handler(config, apiKey);
  } catch (err) {
    handleError(err);
  }
}

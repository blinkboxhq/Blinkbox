/**
 * SendGrid — operation router. Merges every v1 resource map into one dispatch
 * table; handlers are called `(config, token)` exactly as the monolith did.
 */
import { handleError } from "./GenericFunctions.js";
import { mailOperations } from "./v1/MailDescription.js";
import { contactOperations } from "./v1/ContactDescription.js";
import { listOperations } from "./v1/ListDescription.js";
import { templateOperations } from "./v1/TemplateDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...mailOperations,
  ...contactOperations,
  ...listOperations,
  ...templateOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "sendEmail";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `SendGrid: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

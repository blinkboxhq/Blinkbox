/**
 * LinkedIn — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, token)` → handler,
 * funneling errors to handleError. Throws on unknown op, matching the original
 * node's contract.
 */
import { handleError } from "./GenericFunctions.js";
import { postOperations } from "./v1/PostDescription.js";
import { profileOperations } from "./v1/ProfileDescription.js";
import { organizationOperations } from "./v1/OrganizationDescription.js";
import { socialOperations } from "./v1/SocialDescription.js";

export const OPERATIONS = {
  ...postOperations,
  ...profileOperations,
  ...organizationOperations,
  ...socialOperations,
};

export const DEFAULT_OPERATION = "sharePost";

export async function run(config, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    throw new Error(`LinkedIn: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}

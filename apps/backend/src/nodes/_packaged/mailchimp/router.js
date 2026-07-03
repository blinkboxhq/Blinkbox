/**
 * Mailchimp — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { campaignOperations } from "./v1/CampaignDescription.js";
import { listOperations } from "./v1/ListDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...campaignOperations,
  ...listOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "listCampaigns";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Mailchimp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

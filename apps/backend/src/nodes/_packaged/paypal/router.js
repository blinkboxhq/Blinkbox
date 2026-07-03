/**
 * PAYPAL — operation router. Spreads the order / payout / billing operation
 * maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError. Throws on
 * unknown op (the monolith's switch default threw, so the slim entry rethrows
 * too rather than skipping).
 */
import { handleError } from "./GenericFunctions.js";
import { orderOperations } from "./v1/OrderDescription.js";
import { payoutOperations } from "./v1/PayoutDescription.js";
import { billingOperations } from "./v1/BillingDescription.js";

export const OPERATIONS = {
  ...orderOperations,
  ...payoutOperations,
  ...billingOperations,
};

export const DEFAULT_OPERATION = "createOrder";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`PayPal: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}

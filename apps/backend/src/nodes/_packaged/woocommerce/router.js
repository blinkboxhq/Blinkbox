/**
 * WOOCOMMERCE — operation router. Spreads the order / product / customer
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, api)` → handler, funneling errors to handleError. Throws on
 * unknown op (the monolith's switch default threw), with the original
 * double-quoted message text. Handlers receive (config, api).
 */
import { handleError } from "./GenericFunctions.js";
import { orderOperations } from "./v1/OrderDescription.js";
import { productOperations } from "./v1/ProductDescription.js";
import { customerOperations } from "./v1/CustomerDescription.js";

export const OPERATIONS = {
  ...orderOperations,
  ...productOperations,
  ...customerOperations,
};

export const DEFAULT_OPERATION = "listOrders";

export async function run(config, api) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`WooCommerce: Unknown operation "${operation}".`);
  try {
    return await handler(config, api);
  } catch (err) {
    handleError(err);
  }
}

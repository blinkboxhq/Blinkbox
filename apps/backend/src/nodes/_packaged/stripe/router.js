/**
 * Stripe — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, req)` where `req`
 * is the form-encoded requester built by the backend entry via makeReq(apiKey).
 */
import { handleError } from "./GenericFunctions.js";
import { customerOperations } from "./v1/CustomerDescription.js";
import { paymentOperations } from "./v1/PaymentDescription.js";
import { billingOperations } from "./v1/BillingDescription.js";
import { checkoutOperations } from "./v1/CheckoutDescription.js";
import { financeOperations } from "./v1/FinanceDescription.js";

export const OPERATIONS = {
  ...customerOperations,
  ...paymentOperations,
  ...billingOperations,
  ...checkoutOperations,
  ...financeOperations,
};

export const DEFAULT_OPERATION = "listCustomers";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Stripe: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}

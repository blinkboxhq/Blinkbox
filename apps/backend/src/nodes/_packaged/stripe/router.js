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

export const OPERATION_SCHEMA = {
  createCustomer: { description: "Create a customer", recommended: true },
  getCustomer: { description: "Read one customer by ID" },
  updateCustomer: { description: "Update a customer's details or metadata" },
  deleteCustomer: { description: "Permanently delete a customer" },
  listCustomers: { description: "List customers, filterable by email", recommended: true },
  searchCustomers: { description: "Search customers with Stripe query syntax", recommended: true },
  createPaymentIntent: { description: "Create a payment intent to charge an amount", recommended: true },
  getPaymentIntent: { description: "Read one payment intent and its status" },
  updatePaymentIntent: { description: "Update a payment intent's amount or metadata" },
  confirmPaymentIntent: { description: "Confirm a payment intent to attempt the charge" },
  capturePaymentIntent: { description: "Capture a previously authorized payment intent" },
  cancelPaymentIntent: { description: "Cancel an uncaptured payment intent" },
  listPaymentIntents: { description: "List payment intents, newest first" },
  getCharge: { description: "Read one charge by ID" },
  listCharges: { description: "List charges, filterable by customer" },
  captureCharge: { description: "Capture an authorized charge" },
  createRefund: { description: "Refund a charge or payment intent, fully or partially", recommended: true },
  getRefund: { description: "Read one refund by ID" },
  listRefunds: { description: "List refunds" },
  createInvoice: { description: "Create a draft invoice for a customer" },
  getInvoice: { description: "Read one invoice by ID" },
  finalizeInvoice: { description: "Finalize a draft invoice so it can be paid" },
  payInvoice: { description: "Attempt payment on a finalized invoice" },
  sendInvoice: { description: "Email an invoice to the customer" },
  voidInvoice: { description: "Void a finalized invoice" },
  listInvoices: { description: "List invoices, filterable by customer and status", recommended: true },
  createInvoiceItem: { description: "Add a line item to a customer's next invoice" },
  createProduct: { description: "Create a product" },
  getProduct: { description: "Read one product by ID" },
  updateProduct: { description: "Update a product's details" },
  deleteProduct: { description: "Delete a product" },
  listProducts: { description: "List products" },
  createPrice: { description: "Create a price for a product" },
  getPrice: { description: "Read one price by ID" },
  updatePrice: { description: "Update a price's metadata or active flag" },
  listPrices: { description: "List prices, filterable by product" },
  createSubscription: { description: "Subscribe a customer to one or more prices" },
  getSubscription: { description: "Read one subscription and its status" },
  updateSubscription: { description: "Change a subscription's items or settings" },
  cancelSubscription: { description: "Cancel a subscription now or at period end" },
  listSubscriptions: { description: "List subscriptions, filterable by customer and status" },
  createCheckoutSession: { description: "Create a hosted checkout page and get its URL", recommended: true },
  getCheckoutSession: { description: "Read one checkout session and its payment status" },
  listCheckoutSessions: { description: "List checkout sessions" },
  expireCheckoutSession: { description: "Expire an open checkout session" },
  createPaymentLink: { description: "Create a reusable payment link" },
  listPaymentLinks: { description: "List payment links" },
  createCoupon: { description: "Create a discount coupon" },
  listCoupons: { description: "List coupons" },
  deleteCoupon: { description: "Delete a coupon" },
  createPromoCode: { description: "Create a customer-facing promo code for a coupon" },
  listPromoCodes: { description: "List promo codes" },
  createPayout: { description: "Send a payout to the connected bank account" },
  listPayouts: { description: "List payouts" },
  getBalance: { description: "Read the account's available and pending balance", recommended: true },
  listBalanceTransactions: { description: "List balance transactions (fees, charges, payouts)" },
  listDisputes: { description: "List disputes" },
  getDispute: { description: "Read one dispute by ID" },
  closeDispute: { description: "Close a dispute, accepting the loss" },
  attachPaymentMethod: { description: "Attach a payment method to a customer" },
  detachPaymentMethod: { description: "Detach a payment method from its customer" },
  listPaymentMethods: { description: "List a customer's payment methods" },
  createSetupIntent: { description: "Create a setup intent to save a payment method" },
  createTransfer: { description: "Transfer funds to a connected account" },
  listTransfers: { description: "List transfers" },
  listEvents: { description: "List recent webhook events" },
  getEvent: { description: "Read one event by ID" },
};

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

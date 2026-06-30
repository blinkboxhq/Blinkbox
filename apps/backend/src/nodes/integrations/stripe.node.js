/**
 * STRIPE NODE — nuclear dispatch
 * Stripe REST API v1: customers, payment intents, charges, refunds, invoices,
 * products, prices, subscriptions, checkout, payment links, coupons, payouts,
 * balance, disputes, payment methods, setup intents, transfers, events.
 * Auth: Stripe secret key (sk_live_/sk_test_) from credential vault.
 * Bodies are form-encoded (application/x-www-form-urlencoded).
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.stripe.com/v1";

const skip = (op, msg) => ({ success: false, error: `Stripe ${op}: ${msg}`, skipped: true });
const lim = (v, d) => Math.min(Number(v ?? d) || d, 100);
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
const enc = encodeURIComponent;

function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

function flatten(obj, params = new URLSearchParams(), prefix = "") {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") flatten(item, params, `${key}[${i}]`);
        else params.append(`${key}[${i}]`, String(item));
      });
    } else if (typeof v === "object") {
      flatten(v, params, key);
    } else {
      params.set(key, String(v));
    }
  }
  return params;
}

function makeReq(apiKey) {
  return function stripeReq(method, path, data) {
    const params = data ? flatten(data) : null;
    return axios({
      method,
      url: `${BASE}${path}`,
      data: method !== "GET" && params ? params.toString() : undefined,
      params: method === "GET" && params ? Object.fromEntries(params) : undefined,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": method !== "GET" ? "application/x-www-form-urlencoded" : undefined,
      },
      timeout: 15000,
    }).then((r) => r.data);
  };
}

const ok = (data) => ({ success: true, ...data });
const list = (data) => ({ success: true, data: data.data, count: data.data?.length || 0, has_more: data.has_more });

function metadata(config) {
  if (!config.metadata) return undefined;
  if (typeof config.metadata === "object") return config.metadata;
  try { return JSON.parse(config.metadata); } catch { return undefined; }
}

/* ---------------- Customers ---------------- */

async function opCreateCustomer(config, req) {
  return ok(await req("POST", "/customers", {
    email: config.email, name: config.name, phone: config.phone,
    description: config.description, metadata: metadata(config),
  }));
}
async function opGetCustomer(config, req) {
  const e = need(config, "customerId", "getCustomer"); if (e) return e;
  return ok(await req("GET", `/customers/${enc(config.customerId)}`));
}
async function opUpdateCustomer(config, req) {
  const e = need(config, "customerId", "updateCustomer"); if (e) return e;
  return ok(await req("POST", `/customers/${enc(config.customerId)}`, {
    email: config.email, name: config.name, phone: config.phone,
    description: config.description, metadata: metadata(config),
  }));
}
async function opDeleteCustomer(config, req) {
  const e = need(config, "customerId", "deleteCustomer"); if (e) return e;
  return ok(await req("DELETE", `/customers/${enc(config.customerId)}`));
}
async function opListCustomers(config, req) {
  return list(await req("GET", "/customers", { email: config.email, limit: lim(config.limit, 10) }));
}
async function opSearchCustomers(config, req) {
  const e = need(config, "query", "searchCustomers"); if (e) return e;
  return list(await req("GET", "/customers/search", { query: config.query, limit: lim(config.limit, 10) }));
}

/* ---------------- Payment Intents ---------------- */

async function opCreatePaymentIntent(config, req) {
  let e = need(config, "amount", "createPaymentIntent"); if (e) return e;
  e = need(config, "currency", "createPaymentIntent"); if (e) return e;
  return ok(await req("POST", "/payment_intents", {
    amount: config.amount, currency: config.currency, customer: config.customerId,
    description: config.description, payment_method: config.paymentMethodId,
    receipt_email: config.email, metadata: metadata(config),
    confirm: config.confirm === true ? true : undefined,
    automatic_payment_methods: config.automatic ? { enabled: true } : undefined,
  }));
}
async function opGetPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "getPaymentIntent"); if (e) return e;
  return ok(await req("GET", `/payment_intents/${enc(config.paymentIntentId)}`));
}
async function opUpdatePaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "updatePaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}`, {
    amount: config.amount, description: config.description, metadata: metadata(config),
  }));
}
async function opConfirmPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "confirmPaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/confirm`, {
    payment_method: config.paymentMethodId,
  }));
}
async function opCapturePaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "capturePaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/capture`, {
    amount_to_capture: config.amount,
  }));
}
async function opCancelPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "cancelPaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/cancel`, {
    cancellation_reason: config.reason,
  }));
}
async function opListPaymentIntents(config, req) {
  return list(await req("GET", "/payment_intents", { customer: config.customerId, limit: lim(config.limit, 10) }));
}

/* ---------------- Charges ---------------- */

async function opGetCharge(config, req) {
  const e = need(config, "chargeId", "getCharge"); if (e) return e;
  return ok(await req("GET", `/charges/${enc(config.chargeId)}`));
}
async function opListCharges(config, req) {
  return list(await req("GET", "/charges", { customer: config.customerId, limit: lim(config.limit, 10) }));
}
async function opCaptureCharge(config, req) {
  const e = need(config, "chargeId", "captureCharge"); if (e) return e;
  return ok(await req("POST", `/charges/${enc(config.chargeId)}/capture`, { amount: config.amount }));
}

/* ---------------- Refunds ---------------- */

async function opCreateRefund(config, req) {
  if (!config.chargeId && !config.paymentIntentId) return skip("createRefund", "'chargeId' or 'paymentIntentId' is required.");
  return ok(await req("POST", "/refunds", {
    charge: config.chargeId, payment_intent: config.paymentIntentId,
    amount: config.amount, reason: config.reason, metadata: metadata(config),
  }));
}
async function opGetRefund(config, req) {
  const e = need(config, "refundId", "getRefund"); if (e) return e;
  return ok(await req("GET", `/refunds/${enc(config.refundId)}`));
}
async function opListRefunds(config, req) {
  return list(await req("GET", "/refunds", { charge: config.chargeId, payment_intent: config.paymentIntentId, limit: lim(config.limit, 10) }));
}

/* ---------------- Invoices ---------------- */

async function opCreateInvoice(config, req) {
  const e = need(config, "customerId", "createInvoice"); if (e) return e;
  return ok(await req("POST", "/invoices", {
    customer: config.customerId, description: config.description,
    auto_advance: config.autoAdvance === true ? true : undefined,
    collection_method: config.collectionMethod, metadata: metadata(config),
  }));
}
async function opGetInvoice(config, req) {
  const e = need(config, "invoiceId", "getInvoice"); if (e) return e;
  return ok(await req("GET", `/invoices/${enc(config.invoiceId)}`));
}
async function opFinalizeInvoice(config, req) {
  const e = need(config, "invoiceId", "finalizeInvoice"); if (e) return e;
  return ok(await req("POST", `/invoices/${enc(config.invoiceId)}/finalize`));
}
async function opPayInvoice(config, req) {
  const e = need(config, "invoiceId", "payInvoice"); if (e) return e;
  return ok(await req("POST", `/invoices/${enc(config.invoiceId)}/pay`));
}
async function opSendInvoice(config, req) {
  const e = need(config, "invoiceId", "sendInvoice"); if (e) return e;
  return ok(await req("POST", `/invoices/${enc(config.invoiceId)}/send`));
}
async function opVoidInvoice(config, req) {
  const e = need(config, "invoiceId", "voidInvoice"); if (e) return e;
  return ok(await req("POST", `/invoices/${enc(config.invoiceId)}/void`));
}
async function opListInvoices(config, req) {
  return list(await req("GET", "/invoices", { customer: config.customerId, status: config.status, limit: lim(config.limit, 10) }));
}
async function opCreateInvoiceItem(config, req) {
  let e = need(config, "customerId", "createInvoiceItem"); if (e) return e;
  e = need(config, "amount", "createInvoiceItem"); if (e) return e;
  return ok(await req("POST", "/invoiceitems", {
    customer: config.customerId, amount: config.amount, currency: config.currency || "usd",
    description: config.description, invoice: config.invoiceId,
  }));
}

/* ---------------- Products & Prices ---------------- */

async function opCreateProduct(config, req) {
  const e = need(config, "name", "createProduct"); if (e) return e;
  return ok(await req("POST", "/products", {
    name: config.name, description: config.description,
    active: config.active === false ? false : undefined, metadata: metadata(config),
  }));
}
async function opGetProduct(config, req) {
  const e = need(config, "productId", "getProduct"); if (e) return e;
  return ok(await req("GET", `/products/${enc(config.productId)}`));
}
async function opUpdateProduct(config, req) {
  const e = need(config, "productId", "updateProduct"); if (e) return e;
  return ok(await req("POST", `/products/${enc(config.productId)}`, {
    name: config.name, description: config.description, metadata: metadata(config),
  }));
}
async function opDeleteProduct(config, req) {
  const e = need(config, "productId", "deleteProduct"); if (e) return e;
  return ok(await req("DELETE", `/products/${enc(config.productId)}`));
}
async function opListProducts(config, req) {
  return list(await req("GET", "/products", { active: config.active, limit: lim(config.limit, 10) }));
}

async function opCreatePrice(config, req) {
  let e = need(config, "productId", "createPrice"); if (e) return e;
  e = need(config, "unitAmount", "createPrice"); if (e) return e;
  e = need(config, "currency", "createPrice"); if (e) return e;
  return ok(await req("POST", "/prices", {
    product: config.productId, unit_amount: config.unitAmount, currency: config.currency,
    recurring: config.interval ? { interval: config.interval } : undefined, metadata: metadata(config),
  }));
}
async function opGetPrice(config, req) {
  const e = need(config, "priceId", "getPrice"); if (e) return e;
  return ok(await req("GET", `/prices/${enc(config.priceId)}`));
}
async function opUpdatePrice(config, req) {
  const e = need(config, "priceId", "updatePrice"); if (e) return e;
  return ok(await req("POST", `/prices/${enc(config.priceId)}`, {
    active: config.active, metadata: metadata(config),
  }));
}
async function opListPrices(config, req) {
  return list(await req("GET", "/prices", { product: config.productId, active: config.active, limit: lim(config.limit, 10) }));
}

/* ---------------- Subscriptions ---------------- */

async function opCreateSubscription(config, req) {
  let e = need(config, "customerId", "createSubscription"); if (e) return e;
  e = need(config, "priceId", "createSubscription"); if (e) return e;
  return ok(await req("POST", "/subscriptions", {
    customer: config.customerId,
    items: [{ price: config.priceId, quantity: config.quantity || 1 }],
    trial_period_days: config.trialDays, metadata: metadata(config),
  }));
}
async function opGetSubscription(config, req) {
  const e = need(config, "subscriptionId", "getSubscription"); if (e) return e;
  return ok(await req("GET", `/subscriptions/${enc(config.subscriptionId)}`));
}
async function opUpdateSubscription(config, req) {
  const e = need(config, "subscriptionId", "updateSubscription"); if (e) return e;
  return ok(await req("POST", `/subscriptions/${enc(config.subscriptionId)}`, {
    cancel_at_period_end: config.cancelAtPeriodEnd, metadata: metadata(config),
    proration_behavior: config.prorationBehavior,
  }));
}
async function opCancelSubscription(config, req) {
  const e = need(config, "subscriptionId", "cancelSubscription"); if (e) return e;
  return ok(await req("DELETE", `/subscriptions/${enc(config.subscriptionId)}`));
}
async function opListSubscriptions(config, req) {
  return list(await req("GET", "/subscriptions", { customer: config.customerId, status: config.status, limit: lim(config.limit, 10) }));
}

/* ---------------- Checkout & Payment Links ---------------- */

async function opCreateCheckoutSession(config, req) {
  let e = need(config, "priceId", "createCheckoutSession"); if (e) return e;
  e = need(config, "successUrl", "createCheckoutSession"); if (e) return e;
  return ok(await req("POST", "/checkout/sessions", {
    mode: config.mode || "payment",
    line_items: [{ price: config.priceId, quantity: config.quantity || 1 }],
    success_url: config.successUrl, cancel_url: config.cancelUrl || config.successUrl,
    customer: config.customerId, customer_email: config.email, metadata: metadata(config),
  }));
}
async function opGetCheckoutSession(config, req) {
  const e = need(config, "sessionId", "getCheckoutSession"); if (e) return e;
  return ok(await req("GET", `/checkout/sessions/${enc(config.sessionId)}`));
}
async function opListCheckoutSessions(config, req) {
  return list(await req("GET", "/checkout/sessions", { customer: config.customerId, limit: lim(config.limit, 10) }));
}
async function opExpireCheckoutSession(config, req) {
  const e = need(config, "sessionId", "expireCheckoutSession"); if (e) return e;
  return ok(await req("POST", `/checkout/sessions/${enc(config.sessionId)}/expire`));
}
async function opCreatePaymentLink(config, req) {
  const e = need(config, "priceId", "createPaymentLink"); if (e) return e;
  return ok(await req("POST", "/payment_links", {
    line_items: [{ price: config.priceId, quantity: config.quantity || 1 }], metadata: metadata(config),
  }));
}
async function opListPaymentLinks(config, req) {
  return list(await req("GET", "/payment_links", { limit: lim(config.limit, 10) }));
}

/* ---------------- Coupons & Promo Codes ---------------- */

async function opCreateCoupon(config, req) {
  return ok(await req("POST", "/coupons", {
    percent_off: config.percentOff, amount_off: config.amountOff, currency: config.currency,
    duration: config.duration || "once", name: config.name, id: config.couponId,
  }));
}
async function opListCoupons(config, req) {
  return list(await req("GET", "/coupons", { limit: lim(config.limit, 10) }));
}
async function opDeleteCoupon(config, req) {
  const e = need(config, "couponId", "deleteCoupon"); if (e) return e;
  return ok(await req("DELETE", `/coupons/${enc(config.couponId)}`));
}
async function opCreatePromoCode(config, req) {
  const e = need(config, "couponId", "createPromoCode"); if (e) return e;
  return ok(await req("POST", "/promotion_codes", { coupon: config.couponId, code: config.code, max_redemptions: config.maxRedemptions }));
}
async function opListPromoCodes(config, req) {
  return list(await req("GET", "/promotion_codes", { coupon: config.couponId, limit: lim(config.limit, 10) }));
}

/* ---------------- Payouts & Balance ---------------- */

async function opCreatePayout(config, req) {
  let e = need(config, "amount", "createPayout"); if (e) return e;
  e = need(config, "currency", "createPayout"); if (e) return e;
  return ok(await req("POST", "/payouts", { amount: config.amount, currency: config.currency, description: config.description }));
}
async function opListPayouts(config, req) {
  return list(await req("GET", "/payouts", { status: config.status, limit: lim(config.limit, 10) }));
}
async function opGetBalance(config, req) {
  return ok(await req("GET", "/balance"));
}
async function opListBalanceTransactions(config, req) {
  return list(await req("GET", "/balance_transactions", { type: config.type, limit: lim(config.limit, 10) }));
}

/* ---------------- Disputes ---------------- */

async function opListDisputes(config, req) {
  return list(await req("GET", "/disputes", { charge: config.chargeId, limit: lim(config.limit, 10) }));
}
async function opGetDispute(config, req) {
  const e = need(config, "disputeId", "getDispute"); if (e) return e;
  return ok(await req("GET", `/disputes/${enc(config.disputeId)}`));
}
async function opCloseDispute(config, req) {
  const e = need(config, "disputeId", "closeDispute"); if (e) return e;
  return ok(await req("POST", `/disputes/${enc(config.disputeId)}/close`));
}

/* ---------------- Payment Methods & Setup Intents ---------------- */

async function opAttachPaymentMethod(config, req) {
  let e = need(config, "paymentMethodId", "attachPaymentMethod"); if (e) return e;
  e = need(config, "customerId", "attachPaymentMethod"); if (e) return e;
  return ok(await req("POST", `/payment_methods/${enc(config.paymentMethodId)}/attach`, { customer: config.customerId }));
}
async function opDetachPaymentMethod(config, req) {
  const e = need(config, "paymentMethodId", "detachPaymentMethod"); if (e) return e;
  return ok(await req("POST", `/payment_methods/${enc(config.paymentMethodId)}/detach`));
}
async function opListPaymentMethods(config, req) {
  const e = need(config, "customerId", "listPaymentMethods"); if (e) return e;
  return list(await req("GET", "/payment_methods", { customer: config.customerId, type: config.type || "card", limit: lim(config.limit, 10) }));
}
async function opCreateSetupIntent(config, req) {
  return ok(await req("POST", "/setup_intents", { customer: config.customerId, payment_method_types: csv(config.type || "card") }));
}

/* ---------------- Transfers & Events ---------------- */

async function opCreateTransfer(config, req) {
  let e = need(config, "amount", "createTransfer"); if (e) return e;
  e = need(config, "currency", "createTransfer"); if (e) return e;
  e = need(config, "destination", "createTransfer"); if (e) return e;
  return ok(await req("POST", "/transfers", { amount: config.amount, currency: config.currency, destination: config.destination }));
}
async function opListTransfers(config, req) {
  return list(await req("GET", "/transfers", { destination: config.destination, limit: lim(config.limit, 10) }));
}
async function opListEvents(config, req) {
  return list(await req("GET", "/events", { type: config.type, limit: lim(config.limit, 10) }));
}
async function opGetEvent(config, req) {
  const e = need(config, "eventId", "getEvent"); if (e) return e;
  return ok(await req("GET", `/events/${enc(config.eventId)}`));
}

const OPERATIONS = {
  createCustomer: opCreateCustomer, getCustomer: opGetCustomer, updateCustomer: opUpdateCustomer,
  deleteCustomer: opDeleteCustomer, listCustomers: opListCustomers, searchCustomers: opSearchCustomers,
  createPaymentIntent: opCreatePaymentIntent, getPaymentIntent: opGetPaymentIntent,
  updatePaymentIntent: opUpdatePaymentIntent, confirmPaymentIntent: opConfirmPaymentIntent,
  capturePaymentIntent: opCapturePaymentIntent, cancelPaymentIntent: opCancelPaymentIntent,
  listPaymentIntents: opListPaymentIntents,
  getCharge: opGetCharge, listCharges: opListCharges, captureCharge: opCaptureCharge,
  createRefund: opCreateRefund, getRefund: opGetRefund, listRefunds: opListRefunds,
  createInvoice: opCreateInvoice, getInvoice: opGetInvoice, finalizeInvoice: opFinalizeInvoice,
  payInvoice: opPayInvoice, sendInvoice: opSendInvoice, voidInvoice: opVoidInvoice,
  listInvoices: opListInvoices, createInvoiceItem: opCreateInvoiceItem,
  createProduct: opCreateProduct, getProduct: opGetProduct, updateProduct: opUpdateProduct,
  deleteProduct: opDeleteProduct, listProducts: opListProducts,
  createPrice: opCreatePrice, getPrice: opGetPrice, updatePrice: opUpdatePrice, listPrices: opListPrices,
  createSubscription: opCreateSubscription, getSubscription: opGetSubscription,
  updateSubscription: opUpdateSubscription, cancelSubscription: opCancelSubscription,
  listSubscriptions: opListSubscriptions,
  createCheckoutSession: opCreateCheckoutSession, getCheckoutSession: opGetCheckoutSession,
  listCheckoutSessions: opListCheckoutSessions, expireCheckoutSession: opExpireCheckoutSession,
  createPaymentLink: opCreatePaymentLink, listPaymentLinks: opListPaymentLinks,
  createCoupon: opCreateCoupon, listCoupons: opListCoupons, deleteCoupon: opDeleteCoupon,
  createPromoCode: opCreatePromoCode, listPromoCodes: opListPromoCodes,
  createPayout: opCreatePayout, listPayouts: opListPayouts,
  getBalance: opGetBalance, listBalanceTransactions: opListBalanceTransactions,
  listDisputes: opListDisputes, getDispute: opGetDispute, closeDispute: opCloseDispute,
  attachPaymentMethod: opAttachPaymentMethod, detachPaymentMethod: opDetachPaymentMethod,
  listPaymentMethods: opListPaymentMethods, createSetupIntent: opCreateSetupIntent,
  createTransfer: opCreateTransfer, listTransfers: opListTransfers,
  listEvents: opListEvents, getEvent: opGetEvent,
};

function handleError(err) {
  if (err.message?.startsWith("Stripe")) throw err;
  const code = err.response?.data?.error?.code;
  const msg = err.response?.data?.error?.message ?? err.message;
  const status = err.response?.status;
  if (status === 401) throw new Error("Stripe: Invalid API key — check your secret key in the credential vault.");
  if (status === 400) throw new Error(`Stripe: Bad request — ${msg}`);
  if (status === 402) throw new Error(`Stripe: Payment required / card declined — ${msg}`);
  if (status === 403) throw new Error(`Stripe: Forbidden — ${msg}`);
  if (status === 404) throw new Error(`Stripe: Resource not found — ${msg}`);
  if (status === 409) throw new Error(`Stripe: Conflict — ${msg}`);
  if (status === 422) throw new Error(`Stripe: Unprocessable entity — ${msg}`);
  if (status === 429) throw new Error(`Stripe: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Stripe: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Stripe: ${code ?? status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listCustomers";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Stripe: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Stripe: No credential selected.", skipped: true };
    }

    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Stripe");
    } catch (e) {
      return { success: false, error: `Stripe: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const req = makeReq(apiKey);
    try {
      return await handler(config, req);
    } catch (err) {
      handleError(err);
    }
  },
};

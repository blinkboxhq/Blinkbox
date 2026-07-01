/**
 * Stripe — Invoices, Products, Prices & Subscriptions.
 */
import { ok, list, need, enc, lim, metadata } from "../GenericFunctions.js";

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

export const billingOperations = {
  createInvoice: opCreateInvoice, getInvoice: opGetInvoice, finalizeInvoice: opFinalizeInvoice,
  payInvoice: opPayInvoice, sendInvoice: opSendInvoice, voidInvoice: opVoidInvoice,
  listInvoices: opListInvoices, createInvoiceItem: opCreateInvoiceItem,
  createProduct: opCreateProduct, getProduct: opGetProduct, updateProduct: opUpdateProduct,
  deleteProduct: opDeleteProduct, listProducts: opListProducts,
  createPrice: opCreatePrice, getPrice: opGetPrice, updatePrice: opUpdatePrice, listPrices: opListPrices,
  createSubscription: opCreateSubscription, getSubscription: opGetSubscription,
  updateSubscription: opUpdateSubscription, cancelSubscription: opCancelSubscription,
  listSubscriptions: opListSubscriptions,
};

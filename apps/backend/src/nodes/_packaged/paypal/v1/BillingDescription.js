/**
 * PAYPAL — billing resource (products, plans, subscriptions, invoices). Added
 * for n8n parity; none of these existed in the monolith. Handlers receive
 * (config, client).
 */
import { money, parseJson } from "../GenericFunctions.js";

async function opCreateProduct(config, client) {
  if (!config.name) return { success: false, error: "PayPal createProduct: 'name' is required.", skipped: true };
  const body = { name: config.name, type: config.productType || "SERVICE" };
  if (config.description) body.description = config.description;
  if (config.category) body.category = config.category;
  const { data } = await client.post(`/v1/catalogs/products`, body);
  return { success: true, id: data.id, name: data.name, type: data.type };
}

async function opListProducts(config, client) {
  const { data } = await client.get(`/v1/catalogs/products`, {
    params: { page_size: config.limit ? Math.min(Number(config.limit), 100) : 20 },
  });
  return { success: true, products: data.products ?? [], totalItems: data.total_items };
}

async function opCreatePlan(config, client) {
  if (!config.productId) return { success: false, error: "PayPal createPlan: 'productId' is required.", skipped: true };
  if (!config.name) return { success: false, error: "PayPal createPlan: 'name' is required.", skipped: true };
  if (!config.amount || !config.currency) return { success: false, error: "PayPal createPlan: 'amount' and 'currency' are required.", skipped: true };
  const body = {
    product_id: config.productId,
    name: config.name,
    billing_cycles: [
      {
        frequency: { interval_unit: config.intervalUnit || "MONTH", interval_count: Number(config.intervalCount) || 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: Number(config.totalCycles) || 0,
        pricing_scheme: { fixed_price: money(config.currency, config.amount) },
      },
    ],
    payment_preferences: { auto_bill_outstanding: true },
  };
  const { data } = await client.post(`/v1/billing/plans`, body);
  return { success: true, id: data.id, name: data.name, status: data.status };
}

async function opListPlans(config, client) {
  const { data } = await client.get(`/v1/billing/plans`, {
    params: { product_id: config.productId ?? undefined, page_size: config.limit ? Math.min(Number(config.limit), 100) : 20 },
  });
  return { success: true, plans: data.plans ?? [], totalItems: data.total_items };
}

async function opCreateSubscription(config, client) {
  if (!config.planId) return { success: false, error: "PayPal createSubscription: 'planId' is required.", skipped: true };
  const body = { plan_id: config.planId };
  const subscriber = parseJson(config.subscriber, "subscriber");
  if (subscriber) body.subscriber = subscriber;
  if (config.returnUrl || config.cancelUrl) {
    body.application_context = { return_url: config.returnUrl ?? undefined, cancel_url: config.cancelUrl ?? undefined };
  }
  const { data } = await client.post(`/v1/billing/subscriptions`, body);
  const approveLink = data.links?.find((l) => l.rel === "approve")?.href;
  return { success: true, id: data.id, status: data.status, approveLink };
}

async function opGetSubscription(config, client) {
  if (!config.subscriptionId) return { success: false, error: "PayPal getSubscription: 'subscriptionId' is required.", skipped: true };
  const { data } = await client.get(`/v1/billing/subscriptions/${client.enc(config.subscriptionId)}`);
  return { success: true, id: data.id, status: data.status, planId: data.plan_id, subscriber: data.subscriber };
}

async function opCancelSubscription(config, client) {
  if (!config.subscriptionId) return { success: false, error: "PayPal cancelSubscription: 'subscriptionId' is required.", skipped: true };
  await client.post(`/v1/billing/subscriptions/${client.enc(config.subscriptionId)}/cancel`, {
    reason: config.reason || "Cancelled via Blinkbox",
  });
  return { success: true, id: config.subscriptionId, cancelled: true };
}

async function opCreateInvoice(config, client) {
  const detail = parseJson(config.detail, "detail");
  const invoicer = parseJson(config.invoicer, "invoicer");
  const recipients = parseJson(config.recipients, "recipients");
  const items = parseJson(config.items, "items");
  const body = {};
  if (detail) body.detail = detail;
  if (invoicer) body.invoicer = invoicer;
  if (recipients) body.primary_recipients = recipients;
  if (items) body.items = items;
  const { data } = await client.post(`/v2/invoicing/invoices`, body);
  return { success: true, id: data.id, href: data.href };
}

async function opSendInvoice(config, client) {
  if (!config.invoiceId) return { success: false, error: "PayPal sendInvoice: 'invoiceId' is required.", skipped: true };
  const { data } = await client.post(`/v2/invoicing/invoices/${client.enc(config.invoiceId)}/send`, {
    send_to_invoicer: config.sendToInvoicer ?? false,
  });
  return { success: true, id: config.invoiceId, href: data?.href, sent: true };
}

export const billingOperations = {
  createProduct: opCreateProduct,
  listProducts: opListProducts,
  createPlan: opCreatePlan,
  listPlans: opListPlans,
  createSubscription: opCreateSubscription,
  getSubscription: opGetSubscription,
  cancelSubscription: opCancelSubscription,
  createInvoice: opCreateInvoice,
  sendInvoice: opSendInvoice,
};

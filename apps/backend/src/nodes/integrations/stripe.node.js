/**
 * STRIPE NODE
 * Interact with the Stripe API for payments, customers, and subscriptions.
 *
 * Operations:
 *   createCustomer       — Create a new Stripe customer
 *   getCustomer          — Retrieve a customer by ID
 *   listCustomers        — List customers with optional email filter
 *   createPaymentIntent  — Create a PaymentIntent
 *   getPaymentIntent     — Retrieve a PaymentIntent
 *   listCharges          — List charges (optionally filtered by customer)
 *   createRefund         — Refund a charge or payment intent
 *   listInvoices         — List invoices for a customer
 *   createProduct        — Create a product
 *   createPrice          — Create a price for a product
 *
 * Auth: Stripe secret key (sk_live_... or sk_test_...) stored in vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.stripe.com/v1";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Stripe");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message?.startsWith("Stripe")) throw err;
  const code = err.response?.data?.error?.code;
  const msg = err.response?.data?.error?.message ?? err.message;
  const status = err.response?.status;
  if (status === 401) throw new Error("Stripe: Invalid API key.");
  if (status === 400) throw new Error(`Stripe: Bad request — ${msg}`);
  if (status === 404) throw new Error(`Stripe: Resource not found — ${msg}`);
  throw new Error(`Stripe: ${code ?? status ?? "Error"} — ${msg}`);
}

function stripeReq(method, path, data, apiKey) {
  const params = new URLSearchParams();
  function flatten(obj, prefix = "") {
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (v === undefined || v === null) continue;
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === "object" && !Array.isArray(v)) flatten(v, key);
      else params.set(key, String(v));
    }
  }
  if (data) flatten(data);

  return axios({
    method,
    url: `${BASE}${path}`,
    data: method !== "GET" ? params.toString() : undefined,
    params: method === "GET" ? Object.fromEntries(params) : undefined,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": method !== "GET" ? "application/x-www-form-urlencoded" : undefined },
    timeout: 15000,
  });
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listCustomers" } = config;
    const apiKey = await getKey(config.credentialId, context.workspaceId);

    try {
      switch (operation) {
        case "createCustomer": {
          const res = await stripeReq("POST", "/customers", { email: config.email, name: config.name, phone: config.phone, metadata: config.metadata }, apiKey);
          return { id: res.data.id, email: res.data.email, name: res.data.name, created: res.data.created };
        }

        case "getCustomer": {
          if (!config.customerId) return { success: false, error: "Stripe getCustomer: 'customerId' is required — configure this field.", skipped: true };
          const res = await stripeReq("GET", `/customers/${config.customerId}`, null, apiKey);
          return { id: res.data.id, email: res.data.email, name: res.data.name, balance: res.data.balance, currency: res.data.currency };
        }

        case "listCustomers": {
          const res = await stripeReq("GET", "/customers", { email: config.email, limit: Math.min(Number(config.limit ?? 10), 100) }, apiKey);
          return { customers: res.data.data?.map((c) => ({ id: c.id, email: c.email, name: c.name })) ?? [], count: res.data.data?.length ?? 0 };
        }

        case "createPaymentIntent": {
          if (!config.amount) return { success: false, error: "Stripe createPaymentIntent: 'amount' (in cents) is required — configure this field.", skipped: true };
          if (!config.currency) return { success: false, error: "Stripe createPaymentIntent: 'currency' is required — configure this field.", skipped: true };
          const res = await stripeReq("POST", "/payment_intents", { amount: config.amount, currency: config.currency, customer: config.customerId, description: config.description, metadata: config.metadata }, apiKey);
          return { id: res.data.id, status: res.data.status, amount: res.data.amount, currency: res.data.currency, clientSecret: res.data.client_secret };
        }

        case "getPaymentIntent": {
          if (!config.paymentIntentId) return { success: false, error: "Stripe getPaymentIntent: 'paymentIntentId' is required — configure this field.", skipped: true };
          const res = await stripeReq("GET", `/payment_intents/${config.paymentIntentId}`, null, apiKey);
          return { id: res.data.id, status: res.data.status, amount: res.data.amount, currency: res.data.currency, customer: res.data.customer };
        }

        case "listCharges": {
          const res = await stripeReq("GET", "/charges", { customer: config.customerId, limit: Math.min(Number(config.limit ?? 10), 100) }, apiKey);
          return { charges: res.data.data?.map((c) => ({ id: c.id, amount: c.amount, currency: c.currency, status: c.status, description: c.description })) ?? [], count: res.data.data?.length ?? 0 };
        }

        case "createRefund": {
          const res = await stripeReq("POST", "/refunds", { charge: config.chargeId, payment_intent: config.paymentIntentId, amount: config.amount, reason: config.reason }, apiKey);
          return { id: res.data.id, status: res.data.status, amount: res.data.amount, currency: res.data.currency };
        }

        case "listInvoices": {
          const res = await stripeReq("GET", "/invoices", { customer: config.customerId, limit: Math.min(Number(config.limit ?? 10), 100), status: config.status }, apiKey);
          return { invoices: res.data.data?.map((i) => ({ id: i.id, status: i.status, total: i.total, currency: i.currency, url: i.hosted_invoice_url })) ?? [], count: res.data.data?.length ?? 0 };
        }

        case "createProduct": {
          if (!config.name) return { success: false, error: "Stripe createProduct: 'name' is required — configure this field.", skipped: true };
          const res = await stripeReq("POST", "/products", { name: config.name, description: config.description }, apiKey);
          return { id: res.data.id, name: res.data.name, active: res.data.active };
        }

        case "createPrice": {
          if (!config.productId || !config.unitAmount || !config.currency) return { success: false, error: "Stripe createPrice: 'productId', 'unitAmount', 'currency' are required — configure these fields.", skipped: true };
          const res = await stripeReq("POST", "/prices", { product: config.productId, unit_amount: config.unitAmount, currency: config.currency, recurring: config.interval ? { interval: config.interval } : undefined }, apiKey);
          return { id: res.data.id, unitAmount: res.data.unit_amount, currency: res.data.currency, type: res.data.type };
        }

        default:
          throw new Error(`Stripe: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

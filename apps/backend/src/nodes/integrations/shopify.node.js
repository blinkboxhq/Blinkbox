/**
 * SHOPIFY NODE
 * Interact with the Shopify Admin REST API.
 *
 * Operations:
 *   listProducts    — List products
 *   getProduct      — Get product by ID
 *   createProduct   — Create a new product
 *   updateProduct   — Update product fields
 *   listOrders      — List orders with optional filter
 *   getOrder        — Get order by ID
 *   updateOrder     — Update order tags/note
 *   createCustomer  — Create a customer
 *   getCustomer     — Get customer by ID or email
 *   listCustomers   — List customers
 *
 * Auth: Shopify Admin API access token stored in vault
 * Config: also requires 'shop' — e.g. "mystore.myshopify.com"
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Shopify");
}

function handleError(err) {
  if (err.message?.startsWith("Shopify")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors ?? err.message;
  if (status === 401) throw new Error(`Shopify: Authentication failed — check your Admin API access token.`);
  if (status === 403) throw new Error(`Shopify: Permission denied — ${JSON.stringify(msg)}. Verify API scopes.`);
  if (status === 404) throw new Error(`Shopify: Resource not found — ${JSON.stringify(msg)}.`);
  if (status === 422) throw new Error(`Shopify: Validation error — ${JSON.stringify(msg)}.`);
  if (status === 429) throw new Error(`Shopify: Rate limit exceeded (Leaky Bucket) — slow down requests.`);
  throw new Error(`Shopify: ${status ?? "Error"} — ${JSON.stringify(msg)}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listProducts", shop } = config;
    if (!shop) return { success: false, error: "Shopify: 'shop' (e.g. mystore.myshopify.com) is required.", skipped: true };

    const token = await getToken(config.credentialId, context.workspaceId);
    const BASE = `https://${shop}/admin/api/2024-04`;
    const headers = { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "listProducts": {
          const res = await axios.get(`${BASE}/products.json`, {
            headers, timeout: 15000,
            params: { limit: Math.min(Number(config.limit ?? 20), 250), status: config.status, vendor: config.vendor },
          });
          return { products: res.data.products?.map((p) => ({ id: p.id, title: p.title, status: p.status, vendor: p.vendor, price: p.variants?.[0]?.price })) ?? [], count: res.data.products?.length ?? 0 };
        }

        case "getProduct": {
          if (!config.productId) return { success: false, error: "Shopify getProduct: 'productId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/products/${config.productId}.json`, { headers, timeout: 15000 });
          const p = res.data.product;
          return { id: p.id, title: p.title, status: p.status, vendor: p.vendor, body: p.body_html, variants: p.variants?.map((v) => ({ id: v.id, title: v.title, price: v.price, sku: v.sku, inventory: v.inventory_quantity })) ?? [] };
        }

        case "createProduct": {
          if (!config.title) return { success: false, error: "Shopify createProduct: 'title' is required.", skipped: true };
          const product = { title: config.title, body_html: config.description, vendor: config.vendor, status: config.status ?? "draft" };
          if (config.price) product.variants = [{ price: String(config.price), sku: config.sku }];
          const res = await axios.post(`${BASE}/products.json`, { product }, { headers, timeout: 15000 });
          return { id: res.data.product.id, title: res.data.product.title, status: res.data.product.status };
        }

        case "updateProduct": {
          if (!config.productId) return { success: false, error: "Shopify updateProduct: 'productId' is required.", skipped: true };
          const product = {};
          if (config.title) product.title = config.title;
          if (config.description) product.body_html = config.description;
          if (config.status) product.status = config.status;
          const res = await axios.put(`${BASE}/products/${config.productId}.json`, { product }, { headers, timeout: 15000 });
          return { id: res.data.product.id, updated: true };
        }

        case "listOrders": {
          const res = await axios.get(`${BASE}/orders.json`, {
            headers, timeout: 15000,
            params: { limit: Math.min(Number(config.limit ?? 20), 250), status: config.status ?? "any", financial_status: config.financialStatus },
          });
          return { orders: res.data.orders?.map((o) => ({ id: o.id, name: o.name, email: o.email, total: o.total_price, currency: o.currency, financialStatus: o.financial_status, fulfillmentStatus: o.fulfillment_status })) ?? [], count: res.data.orders?.length ?? 0 };
        }

        case "getOrder": {
          if (!config.orderId) return { success: false, error: "Shopify getOrder: 'orderId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/orders/${config.orderId}.json`, { headers, timeout: 15000 });
          const o = res.data.order;
          return { id: o.id, name: o.name, email: o.email, total: o.total_price, currency: o.currency, lineItems: o.line_items?.map((l) => ({ title: l.title, quantity: l.quantity, price: l.price })) ?? [], shippingAddress: o.shipping_address };
        }

        case "updateOrder": {
          if (!config.orderId) return { success: false, error: "Shopify updateOrder: 'orderId' is required.", skipped: true };
          const order = {};
          if (config.note) order.note = config.note;
          if (config.tags) order.tags = config.tags;
          await axios.put(`${BASE}/orders/${config.orderId}.json`, { order }, { headers, timeout: 15000 });
          return { updated: true, orderId: config.orderId };
        }

        case "createCustomer": {
          if (!config.email) return { success: false, error: "Shopify createCustomer: 'email' is required.", skipped: true };
          const customer = { email: config.email, first_name: config.firstName, last_name: config.lastName, phone: config.phone };
          const res = await axios.post(`${BASE}/customers.json`, { customer }, { headers, timeout: 15000 });
          return { id: res.data.customer.id, email: res.data.customer.email };
        }

        case "getCustomer": {
          if (config.email) {
            const res = await axios.get(`${BASE}/customers/search.json`, { headers, timeout: 15000, params: { query: `email:${config.email}` } });
            return { customers: res.data.customers ?? [], count: res.data.customers?.length ?? 0 };
          }
          if (!config.customerId) return { success: false, error: "Shopify getCustomer: 'customerId' or 'email' is required.", skipped: true };
          const res = await axios.get(`${BASE}/customers/${config.customerId}.json`, { headers, timeout: 15000 });
          const c = res.data.customer;
          return { id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name, ordersCount: c.orders_count, totalSpent: c.total_spent };
        }

        case "listCustomers": {
          const res = await axios.get(`${BASE}/customers.json`, { headers, timeout: 15000, params: { limit: Math.min(Number(config.limit ?? 20), 250) } });
          return { customers: res.data.customers?.map((c) => ({ id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name })) ?? [], count: res.data.customers?.length ?? 0 };
        }

        default:
          throw new Error(`Shopify: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

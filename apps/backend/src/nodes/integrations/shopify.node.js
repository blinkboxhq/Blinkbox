/**
 * SHOPIFY NODE — nuclear dispatch
 * Shopify Admin REST API (2024-04): products, variants, collections, inventory,
 * orders, fulfillments, transactions, refunds, customers, draft orders,
 * discounts/price rules, metafields, webhooks, shop info.
 * Auth: Admin API access token (X-Shopify-Access-Token) from vault.
 * Requires per-store 'shop' domain (e.g. mystore.myshopify.com).
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_VERSION = "2024-04";

const skip = (op, msg) => ({ success: false, error: `Shopify ${op}: ${msg}`, skipped: true });
const lim = (v, d) => Math.min(Number(v ?? d) || d, 250);
const enc = encodeURIComponent;

function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

/* ---------------- Products ---------------- */

async function opListProducts(c, { api }) {
  const r = await api.get("/products.json", { params: { limit: lim(c.limit, 20), status: c.status, vendor: c.vendor, product_type: c.productType } });
  return { success: true, data: r.data.products ?? [], count: r.data.products?.length ?? 0 };
}
async function opGetProduct(c, { api }) {
  const e = need(c, "productId", "getProduct"); if (e) return e;
  const r = await api.get(`/products/${enc(c.productId)}.json`);
  return { success: true, ...r.data.product };
}
async function opCreateProduct(c, { api }) {
  const e = need(c, "title", "createProduct"); if (e) return e;
  const product = { title: c.title, body_html: c.description, vendor: c.vendor, product_type: c.productType, status: c.status || "draft", tags: c.tags };
  if (c.price) product.variants = [{ price: String(c.price), sku: c.sku }];
  const r = await api.post("/products.json", { product });
  return { success: true, ...r.data.product };
}
async function opUpdateProduct(c, { api }) {
  const e = need(c, "productId", "updateProduct"); if (e) return e;
  const product = {};
  if (c.title) product.title = c.title;
  if (c.description) product.body_html = c.description;
  if (c.status) product.status = c.status;
  if (c.vendor) product.vendor = c.vendor;
  if (c.tags) product.tags = c.tags;
  const r = await api.put(`/products/${enc(c.productId)}.json`, { product });
  return { success: true, ...r.data.product };
}
async function opDeleteProduct(c, { api }) {
  const e = need(c, "productId", "deleteProduct"); if (e) return e;
  await api.delete(`/products/${enc(c.productId)}.json`);
  return { success: true, deleted: true, productId: c.productId };
}
async function opCountProducts(c, { api }) {
  const r = await api.get("/products/count.json", { params: { status: c.status, vendor: c.vendor } });
  return { success: true, count: r.data.count };
}

/* ---------------- Variants ---------------- */

async function opListVariants(c, { api }) {
  const e = need(c, "productId", "listVariants"); if (e) return e;
  const r = await api.get(`/products/${enc(c.productId)}/variants.json`, { params: { limit: lim(c.limit, 50) } });
  return { success: true, data: r.data.variants ?? [], count: r.data.variants?.length ?? 0 };
}
async function opCreateVariant(c, { api }) {
  let e = need(c, "productId", "createVariant"); if (e) return e;
  e = need(c, "price", "createVariant"); if (e) return e;
  const variant = { price: String(c.price), sku: c.sku, option1: c.option1, barcode: c.barcode, inventory_management: c.trackInventory ? "shopify" : undefined };
  const r = await api.post(`/products/${enc(c.productId)}/variants.json`, { variant });
  return { success: true, ...r.data.variant };
}
async function opUpdateVariant(c, { api }) {
  const e = need(c, "variantId", "updateVariant"); if (e) return e;
  const variant = {};
  if (c.price) variant.price = String(c.price);
  if (c.sku) variant.sku = c.sku;
  if (c.barcode) variant.barcode = c.barcode;
  const r = await api.put(`/variants/${enc(c.variantId)}.json`, { variant });
  return { success: true, ...r.data.variant };
}
async function opDeleteVariant(c, { api }) {
  let e = need(c, "productId", "deleteVariant"); if (e) return e;
  e = need(c, "variantId", "deleteVariant"); if (e) return e;
  await api.delete(`/products/${enc(c.productId)}/variants/${enc(c.variantId)}.json`);
  return { success: true, deleted: true, variantId: c.variantId };
}

/* ---------------- Collections ---------------- */

async function opListCustomCollections(c, { api }) {
  const r = await api.get("/custom_collections.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.custom_collections ?? [], count: r.data.custom_collections?.length ?? 0 };
}
async function opListSmartCollections(c, { api }) {
  const r = await api.get("/smart_collections.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.smart_collections ?? [], count: r.data.smart_collections?.length ?? 0 };
}
async function opCreateCollection(c, { api }) {
  const e = need(c, "title", "createCollection"); if (e) return e;
  const r = await api.post("/custom_collections.json", { custom_collection: { title: c.title, body_html: c.description, published: c.published !== false } });
  return { success: true, ...r.data.custom_collection };
}
async function opAddProductToCollection(c, { api }) {
  let e = need(c, "collectionId", "addProductToCollection"); if (e) return e;
  e = need(c, "productId", "addProductToCollection"); if (e) return e;
  const r = await api.post("/collects.json", { collect: { collection_id: c.collectionId, product_id: c.productId } });
  return { success: true, ...r.data.collect };
}

/* ---------------- Inventory ---------------- */

async function opGetInventoryLevels(c, { api }) {
  const params = { limit: lim(c.limit, 50) };
  if (c.inventoryItemIds) params.inventory_item_ids = c.inventoryItemIds;
  if (c.locationIds) params.location_ids = c.locationIds;
  const r = await api.get("/inventory_levels.json", { params });
  return { success: true, data: r.data.inventory_levels ?? [], count: r.data.inventory_levels?.length ?? 0 };
}
async function opSetInventoryLevel(c, { api }) {
  for (const k of ["inventoryItemId", "locationId", "available"]) { const e = need(c, k, "setInventoryLevel"); if (e) return e; }
  const r = await api.post("/inventory_levels/set.json", { inventory_item_id: c.inventoryItemId, location_id: c.locationId, available: Number(c.available) });
  return { success: true, ...r.data.inventory_level };
}
async function opAdjustInventoryLevel(c, { api }) {
  for (const k of ["inventoryItemId", "locationId", "adjustment"]) { const e = need(c, k, "adjustInventoryLevel"); if (e) return e; }
  const r = await api.post("/inventory_levels/adjust.json", { inventory_item_id: c.inventoryItemId, location_id: c.locationId, available_adjustment: Number(c.adjustment) });
  return { success: true, ...r.data.inventory_level };
}
async function opListLocations(c, { api }) {
  const r = await api.get("/locations.json");
  return { success: true, data: r.data.locations ?? [], count: r.data.locations?.length ?? 0 };
}

/* ---------------- Orders ---------------- */

async function opListOrders(c, { api }) {
  const r = await api.get("/orders.json", { params: { limit: lim(c.limit, 20), status: c.status || "any", financial_status: c.financialStatus, fulfillment_status: c.fulfillmentStatus } });
  return { success: true, data: r.data.orders ?? [], count: r.data.orders?.length ?? 0 };
}
async function opGetOrder(c, { api }) {
  const e = need(c, "orderId", "getOrder"); if (e) return e;
  const r = await api.get(`/orders/${enc(c.orderId)}.json`);
  return { success: true, ...r.data.order };
}
async function opCreateOrder(c, { api }) {
  const e = need(c, "lineItems", "createOrder"); if (e) return e;
  let line_items;
  try { line_items = typeof c.lineItems === "object" ? c.lineItems : JSON.parse(c.lineItems); }
  catch { return skip("createOrder", "'lineItems' must be valid JSON array."); }
  const order = { line_items, email: c.email, financial_status: c.financialStatus, note: c.note, tags: c.tags, send_receipt: c.sendReceipt === true };
  const r = await api.post("/orders.json", { order });
  return { success: true, ...r.data.order };
}
async function opUpdateOrder(c, { api }) {
  const e = need(c, "orderId", "updateOrder"); if (e) return e;
  const order = {};
  if (c.note) order.note = c.note;
  if (c.tags) order.tags = c.tags;
  if (c.email) order.email = c.email;
  const r = await api.put(`/orders/${enc(c.orderId)}.json`, { order });
  return { success: true, ...r.data.order };
}
async function opCancelOrder(c, { api }) {
  const e = need(c, "orderId", "cancelOrder"); if (e) return e;
  const r = await api.post(`/orders/${enc(c.orderId)}/cancel.json`, { reason: c.reason || "other", email: c.sendReceipt === true });
  return { success: true, ...r.data.order };
}
async function opCloseOrder(c, { api }) {
  const e = need(c, "orderId", "closeOrder"); if (e) return e;
  const r = await api.post(`/orders/${enc(c.orderId)}/close.json`, {});
  return { success: true, ...r.data.order };
}
async function opCountOrders(c, { api }) {
  const r = await api.get("/orders/count.json", { params: { status: c.status || "any", financial_status: c.financialStatus } });
  return { success: true, count: r.data.count };
}

/* ---------------- Fulfillments, Transactions & Refunds ---------------- */

async function opListFulfillments(c, { api }) {
  const e = need(c, "orderId", "listFulfillments"); if (e) return e;
  const r = await api.get(`/orders/${enc(c.orderId)}/fulfillments.json`);
  return { success: true, data: r.data.fulfillments ?? [], count: r.data.fulfillments?.length ?? 0 };
}
async function opCreateFulfillment(c, { api }) {
  const e = need(c, "fulfillmentOrderId", "createFulfillment"); if (e) return e;
  const fulfillment = {
    line_items_by_fulfillment_order: [{ fulfillment_order_id: c.fulfillmentOrderId }],
    tracking_info: c.trackingNumber ? { number: c.trackingNumber, company: c.trackingCompany, url: c.trackingUrl } : undefined,
    notify_customer: c.notifyCustomer === true,
  };
  const r = await api.post("/fulfillments.json", { fulfillment });
  return { success: true, ...r.data.fulfillment };
}
async function opListTransactions(c, { api }) {
  const e = need(c, "orderId", "listTransactions"); if (e) return e;
  const r = await api.get(`/orders/${enc(c.orderId)}/transactions.json`);
  return { success: true, data: r.data.transactions ?? [], count: r.data.transactions?.length ?? 0 };
}
async function opCreateRefund(c, { api }) {
  const e = need(c, "orderId", "createRefund"); if (e) return e;
  const refund = { note: c.note, notify: c.notifyCustomer === true };
  if (c.amount) refund.transactions = [{ amount: String(c.amount), kind: "refund" }];
  const r = await api.post(`/orders/${enc(c.orderId)}/refunds.json`, { refund });
  return { success: true, ...r.data.refund };
}

/* ---------------- Customers ---------------- */

async function opListCustomers(c, { api }) {
  const r = await api.get("/customers.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
}
async function opGetCustomer(c, { api }) {
  if (c.email && !c.customerId) {
    const r = await api.get("/customers/search.json", { params: { query: `email:${c.email}` } });
    return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
  }
  const e = need(c, "customerId", "getCustomer"); if (e) return e;
  const r = await api.get(`/customers/${enc(c.customerId)}.json`);
  return { success: true, ...r.data.customer };
}
async function opCreateCustomer(c, { api }) {
  const e = need(c, "email", "createCustomer"); if (e) return e;
  const customer = { email: c.email, first_name: c.firstName, last_name: c.lastName, phone: c.phone, tags: c.tags, note: c.note };
  const r = await api.post("/customers.json", { customer });
  return { success: true, ...r.data.customer };
}
async function opUpdateCustomer(c, { api }) {
  const e = need(c, "customerId", "updateCustomer"); if (e) return e;
  const customer = {};
  if (c.email) customer.email = c.email;
  if (c.firstName) customer.first_name = c.firstName;
  if (c.lastName) customer.last_name = c.lastName;
  if (c.phone) customer.phone = c.phone;
  if (c.tags) customer.tags = c.tags;
  if (c.note) customer.note = c.note;
  const r = await api.put(`/customers/${enc(c.customerId)}.json`, { customer });
  return { success: true, ...r.data.customer };
}
async function opDeleteCustomer(c, { api }) {
  const e = need(c, "customerId", "deleteCustomer"); if (e) return e;
  await api.delete(`/customers/${enc(c.customerId)}.json`);
  return { success: true, deleted: true, customerId: c.customerId };
}
async function opSearchCustomers(c, { api }) {
  const e = need(c, "query", "searchCustomers"); if (e) return e;
  const r = await api.get("/customers/search.json", { params: { query: c.query, limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
}

/* ---------------- Draft Orders ---------------- */

async function opListDraftOrders(c, { api }) {
  const r = await api.get("/draft_orders.json", { params: { limit: lim(c.limit, 20), status: c.status } });
  return { success: true, data: r.data.draft_orders ?? [], count: r.data.draft_orders?.length ?? 0 };
}
async function opCreateDraftOrder(c, { api }) {
  const e = need(c, "lineItems", "createDraftOrder"); if (e) return e;
  let line_items;
  try { line_items = typeof c.lineItems === "object" ? c.lineItems : JSON.parse(c.lineItems); }
  catch { return skip("createDraftOrder", "'lineItems' must be valid JSON array."); }
  const r = await api.post("/draft_orders.json", { draft_order: { line_items, email: c.email, note: c.note, tags: c.tags } });
  return { success: true, ...r.data.draft_order };
}
async function opCompleteDraftOrder(c, { api }) {
  const e = need(c, "draftOrderId", "completeDraftOrder"); if (e) return e;
  const r = await api.put(`/draft_orders/${enc(c.draftOrderId)}/complete.json`, {});
  return { success: true, ...r.data.draft_order };
}

/* ---------------- Discounts / Price Rules ---------------- */

async function opListPriceRules(c, { api }) {
  const r = await api.get("/price_rules.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.price_rules ?? [], count: r.data.price_rules?.length ?? 0 };
}
async function opCreatePriceRule(c, { api }) {
  let e = need(c, "title", "createPriceRule"); if (e) return e;
  e = need(c, "value", "createPriceRule"); if (e) return e;
  const price_rule = {
    title: c.title,
    target_type: "line_item", target_selection: "all", allocation_method: "across",
    value_type: c.valueType || "percentage",
    value: `-${Math.abs(Number(c.value))}`,
    customer_selection: "all",
    starts_at: c.startsAt || new Date().toISOString(),
  };
  const r = await api.post("/price_rules.json", { price_rule });
  return { success: true, ...r.data.price_rule };
}
async function opCreateDiscountCode(c, { api }) {
  let e = need(c, "priceRuleId", "createDiscountCode"); if (e) return e;
  e = need(c, "code", "createDiscountCode"); if (e) return e;
  const r = await api.post(`/price_rules/${enc(c.priceRuleId)}/discount_codes.json`, { discount_code: { code: c.code } });
  return { success: true, ...r.data.discount_code };
}

/* ---------------- Metafields, Webhooks, Shop ---------------- */

async function opListMetafields(c, { api }) {
  const path = c.ownerResource && c.ownerId
    ? `/${c.ownerResource}/${enc(c.ownerId)}/metafields.json`
    : "/metafields.json";
  const r = await api.get(path, { params: { limit: lim(c.limit, 50) } });
  return { success: true, data: r.data.metafields ?? [], count: r.data.metafields?.length ?? 0 };
}
async function opCreateMetafield(c, { api }) {
  for (const k of ["namespace", "key", "value"]) { const e = need(c, k, "createMetafield"); if (e) return e; }
  const metafield = { namespace: c.namespace, key: c.key, value: c.value, type: c.metafieldType || "single_line_text_field" };
  const path = c.ownerResource && c.ownerId
    ? `/${c.ownerResource}/${enc(c.ownerId)}/metafields.json`
    : "/metafields.json";
  const r = await api.post(path, { metafield });
  return { success: true, ...r.data.metafield };
}
async function opListWebhooks(c, { api }) {
  const r = await api.get("/webhooks.json", { params: { limit: lim(c.limit, 50) } });
  return { success: true, data: r.data.webhooks ?? [], count: r.data.webhooks?.length ?? 0 };
}
async function opCreateWebhook(c, { api }) {
  let e = need(c, "topic", "createWebhook"); if (e) return e;
  e = need(c, "address", "createWebhook"); if (e) return e;
  if (!/^https?:\/\//i.test(c.address)) return skip("createWebhook", "'address' must be an http(s) URL.");
  const r = await api.post("/webhooks.json", { webhook: { topic: c.topic, address: c.address, format: "json" } });
  return { success: true, ...r.data.webhook };
}
async function opDeleteWebhook(c, { api }) {
  const e = need(c, "webhookId", "deleteWebhook"); if (e) return e;
  await api.delete(`/webhooks/${enc(c.webhookId)}.json`);
  return { success: true, deleted: true, webhookId: c.webhookId };
}
async function opGetShop(c, { api }) {
  const r = await api.get("/shop.json");
  return { success: true, ...r.data.shop };
}

const OPERATIONS = {
  listProducts: opListProducts, getProduct: opGetProduct, createProduct: opCreateProduct,
  updateProduct: opUpdateProduct, deleteProduct: opDeleteProduct, countProducts: opCountProducts,
  listVariants: opListVariants, createVariant: opCreateVariant, updateVariant: opUpdateVariant, deleteVariant: opDeleteVariant,
  listCustomCollections: opListCustomCollections, listSmartCollections: opListSmartCollections,
  createCollection: opCreateCollection, addProductToCollection: opAddProductToCollection,
  getInventoryLevels: opGetInventoryLevels, setInventoryLevel: opSetInventoryLevel,
  adjustInventoryLevel: opAdjustInventoryLevel, listLocations: opListLocations,
  listOrders: opListOrders, getOrder: opGetOrder, createOrder: opCreateOrder, updateOrder: opUpdateOrder,
  cancelOrder: opCancelOrder, closeOrder: opCloseOrder, countOrders: opCountOrders,
  listFulfillments: opListFulfillments, createFulfillment: opCreateFulfillment,
  listTransactions: opListTransactions, createRefund: opCreateRefund,
  listCustomers: opListCustomers, getCustomer: opGetCustomer, createCustomer: opCreateCustomer,
  updateCustomer: opUpdateCustomer, deleteCustomer: opDeleteCustomer, searchCustomers: opSearchCustomers,
  listDraftOrders: opListDraftOrders, createDraftOrder: opCreateDraftOrder, completeDraftOrder: opCompleteDraftOrder,
  listPriceRules: opListPriceRules, createPriceRule: opCreatePriceRule, createDiscountCode: opCreateDiscountCode,
  listMetafields: opListMetafields, createMetafield: opCreateMetafield,
  listWebhooks: opListWebhooks, createWebhook: opCreateWebhook, deleteWebhook: opDeleteWebhook,
  getShop: opGetShop,
};

function handleError(err) {
  if (err.message?.startsWith("Shopify")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors ?? err.message;
  if (status === 401) throw new Error("Shopify: Authentication failed — check your Admin API access token.");
  if (status === 403) throw new Error(`Shopify: Permission denied — ${JSON.stringify(msg)}. Verify API scopes.`);
  if (status === 404) throw new Error(`Shopify: Resource not found — ${JSON.stringify(msg)}.`);
  if (status === 406) throw new Error("Shopify: Not acceptable — request format issue.");
  if (status === 422) throw new Error(`Shopify: Validation error — ${JSON.stringify(msg)}.`);
  if (status === 429) throw new Error("Shopify: Rate limit exceeded (Leaky Bucket) — slow down requests.");
  if (status >= 500) throw new Error(`Shopify: Server error (${status}) — try again later.`);
  throw new Error(`Shopify: ${status ?? "Error"} — ${JSON.stringify(msg)}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listProducts";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Shopify: Unknown operation "${op}".`, skipped: true };

    if (!config.shop) return { success: false, error: "Shopify: 'shop' (e.g. mystore.myshopify.com) is required.", skipped: true };
    if (!config.credentialId) return { success: false, error: "Shopify: No credential selected.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Shopify");
    } catch (e) {
      return { success: false, error: `Shopify: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const shop = String(config.shop).replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const api = axios.create({
      baseURL: `https://${shop}/admin/api/${API_VERSION}`,
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      timeout: 15000,
    });

    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};

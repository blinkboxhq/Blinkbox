/**
 * WOOCOMMERCE — Order resource. listOrders / getOrder / updateOrder preserved
 * verbatim from the monolith; createOrder, deleteOrder, listOrderNotes and
 * createOrderNote added for parity. Handlers receive (config, api).
 */
import { perPage, parseJson } from "../GenericFunctions.js";

async function opListOrders(config, api) {
  const params = { per_page: perPage(config.limit) };
  if (config.statusFilter && config.statusFilter !== "any") params.status = config.statusFilter;
  const { data } = await api.get("/orders", { params });
  return { success: true, orders: data, count: data.length };
}

async function opGetOrder(config, api) {
  if (!config.orderId) return { success: false, error: "WooCommerce getOrder: 'orderId' is required.", skipped: true };
  const { data } = await api.get(`/orders/${config.orderId}`);
  return { success: true, id: data.id, status: data.status, total: data.total, currency: data.currency, billing: data.billing, line_items: data.line_items };
}

async function opUpdateOrder(config, api) {
  if (!config.orderId) return { success: false, error: "WooCommerce updateOrder: 'orderId' is required.", skipped: true };
  if (!config.status) return { success: false, error: "WooCommerce updateOrder: 'status' is required.", skipped: true };
  const { data } = await api.put(`/orders/${config.orderId}`, { status: config.status });
  return { success: true, id: data.id, status: data.status, updated: true };
}

async function opCreateOrder(config, api) {
  const body = {};
  if (config.status) body.status = config.status;
  if (config.customerId) body.customer_id = Number(config.customerId);
  const lineItems = parseJson(config.lineItems, "lineItems");
  if (Array.isArray(lineItems)) body.line_items = lineItems;
  const billing = parseJson(config.billing, "billing");
  if (billing) body.billing = billing;
  const shipping = parseJson(config.shipping, "shipping");
  if (shipping) body.shipping = shipping;
  if (!body.line_items?.length) return { success: false, error: "WooCommerce createOrder: 'lineItems' (JSON array) is required.", skipped: true };
  const { data } = await api.post("/orders", body);
  return { success: true, id: data.id, status: data.status, total: data.total, created: true };
}

async function opDeleteOrder(config, api) {
  if (!config.orderId) return { success: false, error: "WooCommerce deleteOrder: 'orderId' is required.", skipped: true };
  const { data } = await api.delete(`/orders/${config.orderId}`, { params: { force: config.force === true } });
  return { success: true, id: data.id, deleted: true };
}

async function opListOrderNotes(config, api) {
  if (!config.orderId) return { success: false, error: "WooCommerce listOrderNotes: 'orderId' is required.", skipped: true };
  const { data } = await api.get(`/orders/${config.orderId}/notes`);
  return { success: true, notes: data, count: data.length };
}

async function opCreateOrderNote(config, api) {
  if (!config.orderId) return { success: false, error: "WooCommerce createOrderNote: 'orderId' is required.", skipped: true };
  if (!config.note) return { success: false, error: "WooCommerce createOrderNote: 'note' is required.", skipped: true };
  const { data } = await api.post(`/orders/${config.orderId}/notes`, { note: config.note, customer_note: config.customerNote === true });
  return { success: true, id: data.id, note: data.note, created: true };
}

export const orderOperations = {
  listOrders: opListOrders,
  getOrder: opGetOrder,
  updateOrder: opUpdateOrder,
  createOrder: opCreateOrder,
  deleteOrder: opDeleteOrder,
  listOrderNotes: opListOrderNotes,
  createOrderNote: opCreateOrderNote,
};

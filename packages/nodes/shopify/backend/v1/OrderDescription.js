/**
 * Shopify — Orders.
 */
import { skip, need, enc, lim } from "../GenericFunctions.js";

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

export const orderOperations = {
  listOrders: opListOrders, getOrder: opGetOrder, createOrder: opCreateOrder, updateOrder: opUpdateOrder,
  cancelOrder: opCancelOrder, closeOrder: opCloseOrder, countOrders: opCountOrders,
};

/**
 * Shopify — Fulfillments, Transactions & Refunds.
 */
import { need, enc } from "../GenericFunctions.js";

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

export const fulfillmentOperations = {
  listFulfillments: opListFulfillments, createFulfillment: opCreateFulfillment,
  listTransactions: opListTransactions, createRefund: opCreateRefund,
};

/**
 * Shopify — Draft Orders.
 */
import { skip, need, enc, lim } from "../GenericFunctions.js";

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

export const draftOrderOperations = {
  listDraftOrders: opListDraftOrders, createDraftOrder: opCreateDraftOrder, completeDraftOrder: opCompleteDraftOrder,
};

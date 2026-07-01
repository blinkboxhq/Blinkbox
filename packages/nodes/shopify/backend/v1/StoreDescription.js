/**
 * Shopify — Metafields, Webhooks & Shop.
 */
import { skip, need, enc, lim } from "../GenericFunctions.js";

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

export const storeOperations = {
  listMetafields: opListMetafields, createMetafield: opCreateMetafield,
  listWebhooks: opListWebhooks, createWebhook: opCreateWebhook, deleteWebhook: opDeleteWebhook,
  getShop: opGetShop,
};

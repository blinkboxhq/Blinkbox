/**
 * Shopify — Collections.
 */
import { need, lim } from "../GenericFunctions.js";

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

export const collectionOperations = {
  listCustomCollections: opListCustomCollections, listSmartCollections: opListSmartCollections,
  createCollection: opCreateCollection, addProductToCollection: opAddProductToCollection,
};

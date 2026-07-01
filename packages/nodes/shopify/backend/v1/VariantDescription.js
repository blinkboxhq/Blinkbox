/**
 * Shopify — Variants.
 */
import { need, enc, lim } from "../GenericFunctions.js";

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

export const variantOperations = {
  listVariants: opListVariants, createVariant: opCreateVariant, updateVariant: opUpdateVariant, deleteVariant: opDeleteVariant,
};

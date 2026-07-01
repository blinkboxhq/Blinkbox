/**
 * Shopify — Products.
 */
import { need, enc, lim } from "../GenericFunctions.js";

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

export const productOperations = {
  listProducts: opListProducts, getProduct: opGetProduct, createProduct: opCreateProduct,
  updateProduct: opUpdateProduct, deleteProduct: opDeleteProduct, countProducts: opCountProducts,
};

/**
 * WOOCOMMERCE — Product resource. listProducts / getProduct / createProduct /
 * updateProduct preserved verbatim from the monolith; deleteProduct,
 * listCategories and updateStock added for parity. Handlers receive (config, api).
 */
import { perPage } from "../GenericFunctions.js";

function applyProductBody(config, body) {
  if (config.name) body.name = config.name;
  if (config.regularPrice) body.regular_price = String(config.regularPrice);
  if (config.salePrice) body.sale_price = String(config.salePrice);
  if (config.description) body.description = config.description;
  if (config.sku) body.sku = config.sku;
  if (config.stockQuantity !== undefined && config.stockQuantity !== "") {
    body.manage_stock = true;
    body.stock_quantity = Number(config.stockQuantity);
  }
  return body;
}

async function opListProducts(config, api) {
  const params = { per_page: perPage(config.limit) };
  if (config.categoryId) params.category = config.categoryId;
  if (config.search) params.search = config.search;
  const { data } = await api.get("/products", { params });
  return { success: true, products: data, count: data.length };
}

async function opGetProduct(config, api) {
  if (!config.productId) return { success: false, error: "WooCommerce getProduct: 'productId' is required.", skipped: true };
  const { data } = await api.get(`/products/${config.productId}`);
  return { success: true, id: data.id, name: data.name, status: data.status, price: data.price, regular_price: data.regular_price, stock_quantity: data.stock_quantity };
}

async function opCreateProduct(config, api) {
  if (!config.name) return { success: false, error: "WooCommerce createProduct: 'name' is required.", skipped: true };
  const body = applyProductBody(config, { type: config.type || "simple", status: config.status || "publish" });
  const { data } = await api.post("/products", body);
  return { success: true, id: data.id, name: data.name, status: data.status, price: data.price };
}

async function opUpdateProduct(config, api) {
  if (!config.productId) return { success: false, error: "WooCommerce updateProduct: 'productId' is required.", skipped: true };
  const body = applyProductBody(config, {});
  const { data } = await api.put(`/products/${config.productId}`, body);
  return { success: true, id: data.id, name: data.name, updated: true };
}

async function opDeleteProduct(config, api) {
  if (!config.productId) return { success: false, error: "WooCommerce deleteProduct: 'productId' is required.", skipped: true };
  const { data } = await api.delete(`/products/${config.productId}`, { params: { force: config.force === true } });
  return { success: true, id: data.id, deleted: true };
}

async function opListCategories(config, api) {
  const { data } = await api.get("/products/categories", { params: { per_page: perPage(config.limit) } });
  return { success: true, categories: data, count: data.length };
}

async function opUpdateStock(config, api) {
  if (!config.productId) return { success: false, error: "WooCommerce updateStock: 'productId' is required.", skipped: true };
  if (config.stockQuantity === undefined || config.stockQuantity === "") return { success: false, error: "WooCommerce updateStock: 'stockQuantity' is required.", skipped: true };
  const { data } = await api.put(`/products/${config.productId}`, { manage_stock: true, stock_quantity: Number(config.stockQuantity) });
  return { success: true, id: data.id, stock_quantity: data.stock_quantity, updated: true };
}

export const productOperations = {
  listProducts: opListProducts,
  getProduct: opGetProduct,
  createProduct: opCreateProduct,
  updateProduct: opUpdateProduct,
  deleteProduct: opDeleteProduct,
  listCategories: opListCategories,
  updateStock: opUpdateStock,
};

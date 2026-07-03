/**
 * HubSpot — Product & Line Item resources. Original create/get/list (products)
 * and create (line items) preserved verbatim; CRUD symmetry added for parity.
 * Handlers receive (config, { api }).
 */
import {
  need, props, createObject, getObject, updateObject, deleteObject, listObjects,
} from "../GenericFunctions.js";

const PRODUCT_MAP = { name: "name", price: "price", description: "description", sku: "hs_sku" };
const LINE_ITEM_MAP = { name: "name", quantity: "quantity", price: "price", productId: "hs_product_id" };

function opCreateProduct(c, { api }) {
  const e = need(c, "name", "createProduct"); if (e) return e;
  return createObject(api, "products", props(c, PRODUCT_MAP));
}
function opGetProduct(c, { api }) {
  const e = need(c, "productId", "getProduct"); if (e) return e;
  return getObject(api, "products", c.productId);
}
function opUpdateProduct(c, { api }) {
  const e = need(c, "productId", "updateProduct"); if (e) return e;
  return updateObject(api, "products", c.productId, props(c, PRODUCT_MAP));
}
function opDeleteProduct(c, { api }) {
  const e = need(c, "productId", "deleteProduct"); if (e) return e;
  return deleteObject(api, "products", c.productId);
}
const opListProducts = (c, { api }) => listObjects(api, "products", c);

function opCreateLineItem(c, { api }) {
  const e = need(c, "name", "createLineItem"); if (e) return e;
  return createObject(api, "line_items", props(c, LINE_ITEM_MAP));
}
function opGetLineItem(c, { api }) {
  const e = need(c, "lineItemId", "getLineItem"); if (e) return e;
  return getObject(api, "line_items", c.lineItemId);
}
function opUpdateLineItem(c, { api }) {
  const e = need(c, "lineItemId", "updateLineItem"); if (e) return e;
  return updateObject(api, "line_items", c.lineItemId, props(c, LINE_ITEM_MAP));
}
function opDeleteLineItem(c, { api }) {
  const e = need(c, "lineItemId", "deleteLineItem"); if (e) return e;
  return deleteObject(api, "line_items", c.lineItemId);
}
const opListLineItems = (c, { api }) => listObjects(api, "line_items", c);

export const productOperations = {
  createProduct: opCreateProduct,
  getProduct: opGetProduct,
  updateProduct: opUpdateProduct,
  deleteProduct: opDeleteProduct,
  listProducts: opListProducts,
  createLineItem: opCreateLineItem,
  getLineItem: opGetLineItem,
  updateLineItem: opUpdateLineItem,
  deleteLineItem: opDeleteLineItem,
  listLineItems: opListLineItems,
};

/**
 * WOOCOMMERCE — Customer & Coupon resources. listCustomers / getCustomer /
 * createCoupon preserved verbatim from the monolith; createCustomer,
 * updateCustomer, deleteCustomer, listCoupons and getCoupon added for parity.
 * Handlers receive (config, api).
 */
import { perPage } from "../GenericFunctions.js";

async function opListCustomers(config, api) {
  const params = { per_page: perPage(config.limit) };
  if (config.search) params.search = config.search;
  const { data } = await api.get("/customers", { params });
  return { success: true, customers: data, count: data.length };
}

async function opGetCustomer(config, api) {
  const customerId = config.customerId || config.id;
  if (!customerId) return { success: false, error: "WooCommerce getCustomer: 'customerId' is required.", skipped: true };
  const { data } = await api.get(`/customers/${customerId}`);
  return { success: true, id: data.id, email: data.email, first_name: data.first_name, last_name: data.last_name, orders_count: data.orders_count, total_spent: data.total_spent };
}

async function opCreateCustomer(config, api) {
  if (!config.email) return { success: false, error: "WooCommerce createCustomer: 'email' is required.", skipped: true };
  const body = { email: config.email };
  if (config.firstName) body.first_name = config.firstName;
  if (config.lastName) body.last_name = config.lastName;
  if (config.username) body.username = config.username;
  if (config.password) body.password = config.password;
  const { data } = await api.post("/customers", body);
  return { success: true, id: data.id, email: data.email, created: true };
}

async function opUpdateCustomer(config, api) {
  const customerId = config.customerId || config.id;
  if (!customerId) return { success: false, error: "WooCommerce updateCustomer: 'customerId' is required.", skipped: true };
  const body = {};
  if (config.email) body.email = config.email;
  if (config.firstName) body.first_name = config.firstName;
  if (config.lastName) body.last_name = config.lastName;
  const { data } = await api.put(`/customers/${customerId}`, body);
  return { success: true, id: data.id, email: data.email, updated: true };
}

async function opDeleteCustomer(config, api) {
  const customerId = config.customerId || config.id;
  if (!customerId) return { success: false, error: "WooCommerce deleteCustomer: 'customerId' is required.", skipped: true };
  const { data } = await api.delete(`/customers/${customerId}`, { params: { force: config.force !== false, reassign: config.reassign } });
  return { success: true, id: data.id, deleted: true };
}

async function opCreateCoupon(config, api) {
  if (!config.code) return { success: false, error: "WooCommerce createCoupon: 'code' is required.", skipped: true };
  const body = {
    code: config.code,
    discount_type: config.discountType || "percent",
    amount: String(config.amount || "0"),
  };
  if (config.dateExpires) body.date_expires = config.dateExpires;
  const { data } = await api.post("/coupons", body);
  return { success: true, id: data.id, code: data.code, discount_type: data.discount_type, amount: data.amount };
}

async function opListCoupons(config, api) {
  const { data } = await api.get("/coupons", { params: { per_page: perPage(config.limit) } });
  return { success: true, coupons: data, count: data.length };
}

async function opGetCoupon(config, api) {
  if (!config.couponId) return { success: false, error: "WooCommerce getCoupon: 'couponId' is required.", skipped: true };
  const { data } = await api.get(`/coupons/${config.couponId}`);
  return { success: true, id: data.id, code: data.code, discount_type: data.discount_type, amount: data.amount, date_expires: data.date_expires };
}

export const customerOperations = {
  listCustomers: opListCustomers,
  getCustomer: opGetCustomer,
  createCustomer: opCreateCustomer,
  updateCustomer: opUpdateCustomer,
  deleteCustomer: opDeleteCustomer,
  createCoupon: opCreateCoupon,
  listCoupons: opListCoupons,
  getCoupon: opGetCoupon,
};

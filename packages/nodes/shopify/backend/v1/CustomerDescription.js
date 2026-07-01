/**
 * Shopify — Customers.
 */
import { need, enc, lim } from "../GenericFunctions.js";

async function opListCustomers(c, { api }) {
  const r = await api.get("/customers.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
}
async function opGetCustomer(c, { api }) {
  if (c.email && !c.customerId) {
    const r = await api.get("/customers/search.json", { params: { query: `email:${c.email}` } });
    return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
  }
  const e = need(c, "customerId", "getCustomer"); if (e) return e;
  const r = await api.get(`/customers/${enc(c.customerId)}.json`);
  return { success: true, ...r.data.customer };
}
async function opCreateCustomer(c, { api }) {
  const e = need(c, "email", "createCustomer"); if (e) return e;
  const customer = { email: c.email, first_name: c.firstName, last_name: c.lastName, phone: c.phone, tags: c.tags, note: c.note };
  const r = await api.post("/customers.json", { customer });
  return { success: true, ...r.data.customer };
}
async function opUpdateCustomer(c, { api }) {
  const e = need(c, "customerId", "updateCustomer"); if (e) return e;
  const customer = {};
  if (c.email) customer.email = c.email;
  if (c.firstName) customer.first_name = c.firstName;
  if (c.lastName) customer.last_name = c.lastName;
  if (c.phone) customer.phone = c.phone;
  if (c.tags) customer.tags = c.tags;
  if (c.note) customer.note = c.note;
  const r = await api.put(`/customers/${enc(c.customerId)}.json`, { customer });
  return { success: true, ...r.data.customer };
}
async function opDeleteCustomer(c, { api }) {
  const e = need(c, "customerId", "deleteCustomer"); if (e) return e;
  await api.delete(`/customers/${enc(c.customerId)}.json`);
  return { success: true, deleted: true, customerId: c.customerId };
}
async function opSearchCustomers(c, { api }) {
  const e = need(c, "query", "searchCustomers"); if (e) return e;
  const r = await api.get("/customers/search.json", { params: { query: c.query, limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.customers ?? [], count: r.data.customers?.length ?? 0 };
}

export const customerOperations = {
  listCustomers: opListCustomers, getCustomer: opGetCustomer, createCustomer: opCreateCustomer,
  updateCustomer: opUpdateCustomer, deleteCustomer: opDeleteCustomer, searchCustomers: opSearchCustomers,
};

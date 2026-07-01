/**
 * Stripe — Customers.
 */
import { ok, list, need, enc, lim, metadata } from "../GenericFunctions.js";

async function opCreateCustomer(config, req) {
  return ok(await req("POST", "/customers", {
    email: config.email, name: config.name, phone: config.phone,
    description: config.description, metadata: metadata(config),
  }));
}
async function opGetCustomer(config, req) {
  const e = need(config, "customerId", "getCustomer"); if (e) return e;
  return ok(await req("GET", `/customers/${enc(config.customerId)}`));
}
async function opUpdateCustomer(config, req) {
  const e = need(config, "customerId", "updateCustomer"); if (e) return e;
  return ok(await req("POST", `/customers/${enc(config.customerId)}`, {
    email: config.email, name: config.name, phone: config.phone,
    description: config.description, metadata: metadata(config),
  }));
}
async function opDeleteCustomer(config, req) {
  const e = need(config, "customerId", "deleteCustomer"); if (e) return e;
  return ok(await req("DELETE", `/customers/${enc(config.customerId)}`));
}
async function opListCustomers(config, req) {
  return list(await req("GET", "/customers", { email: config.email, limit: lim(config.limit, 10) }));
}
async function opSearchCustomers(config, req) {
  const e = need(config, "query", "searchCustomers"); if (e) return e;
  return list(await req("GET", "/customers/search", { query: config.query, limit: lim(config.limit, 10) }));
}

export const customerOperations = {
  createCustomer: opCreateCustomer, getCustomer: opGetCustomer, updateCustomer: opUpdateCustomer,
  deleteCustomer: opDeleteCustomer, listCustomers: opListCustomers, searchCustomers: opSearchCustomers,
};

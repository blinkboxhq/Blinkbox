/**
 * HUBSPOT NODE — nuclear dispatch
 * CRM API v3: contacts, companies, deals, tickets, notes, tasks, line items,
 * products, pipelines, owners, associations, properties, lists, batch ops.
 * Auth: HubSpot Private App access token (pat-...) from credential vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.hubapi.com";

const skip = (op, msg) => ({ success: false, error: `HubSpot ${op}: ${msg}`, skipped: true });
const lim = (v, d) => Math.min(Number(v ?? d) || d, 100);
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
const enc = encodeURIComponent;

function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

function parseJson(value, op, field) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { throw new Error(`HubSpot ${op}: '${field}' must be valid JSON.`); }
}

function props(config, map) {
  const out = {};
  for (const [cfgKey, hsKey] of Object.entries(map)) {
    if (config[cfgKey] !== undefined && config[cfgKey] !== "") out[hsKey] = String(config[cfgKey]);
  }
  Object.assign(out, parseJson(config.extraProperties, config.operation, "extraProperties") || {});
  return out;
}

const flat = (r) => ({ id: r.id, ...r.properties, createdAt: r.createdAt, updatedAt: r.updatedAt });
const listOut = (data, key = "results") => ({
  success: true,
  data: data[key]?.map(flat) ?? [],
  count: data[key]?.length ?? 0,
  total: data.total,
  paging: data.paging,
});

/* ---------------- Generic object helpers ---------------- */

const PROPS_BY_OBJECT = {
  contacts: "email,firstname,lastname,phone,company,website,jobtitle,lifecyclestage,hubspot_owner_id",
  companies: "name,domain,phone,city,country,industry,website,numberofemployees,hubspot_owner_id",
  deals: "dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id",
  tickets: "subject,content,hs_pipeline,hs_pipeline_stage,hs_ticket_priority,hubspot_owner_id",
  products: "name,price,description,hs_sku",
  line_items: "name,quantity,price,hs_product_id",
};

async function createObject(api, object, properties, associations) {
  const payload = { properties };
  if (associations?.length) payload.associations = associations;
  const r = await api.post(`/crm/v3/objects/${object}`, payload);
  return { success: true, ...flat(r.data) };
}
async function getObject(api, object, id, extra) {
  const properties = PROPS_BY_OBJECT[object];
  const r = await api.get(`/crm/v3/objects/${object}/${enc(id)}`, { params: { properties, ...extra } });
  return { success: true, ...flat(r.data) };
}
async function updateObject(api, object, id, properties) {
  const r = await api.patch(`/crm/v3/objects/${object}/${enc(id)}`, { properties });
  return { success: true, ...flat(r.data) };
}
async function deleteObject(api, object, id) {
  await api.delete(`/crm/v3/objects/${object}/${enc(id)}`);
  return { success: true, deleted: true, id };
}
async function listObjects(api, object, config) {
  const params = { limit: lim(config.limit, 20), properties: PROPS_BY_OBJECT[object] };
  if (config.after) params.after = config.after;
  const r = await api.get(`/crm/v3/objects/${object}`, { params });
  return listOut(r.data);
}
async function searchObjects(api, object, config) {
  const filterGroups = parseJson(config.filterGroups, config.operation, "filterGroups");
  const body = {
    filterGroups: Array.isArray(filterGroups) ? filterGroups : [],
    query: config.query || undefined,
    limit: lim(config.limit, 20),
    properties: PROPS_BY_OBJECT[object].split(","),
    sorts: config.sortProperty ? [{ propertyName: config.sortProperty, direction: config.sortDirection || "DESCENDING" }] : undefined,
  };
  const r = await api.post(`/crm/v3/objects/${object}/search`, body);
  return listOut(r.data);
}

/* ---------------- Contacts ---------------- */

const CONTACT_MAP = {
  email: "email", firstName: "firstname", lastName: "lastname", phone: "phone",
  company: "company", website: "website", jobTitle: "jobtitle", lifecycleStage: "lifecyclestage",
  ownerId: "hubspot_owner_id",
};

const opCreateContact = (c, { api }) => createObject(api, "contacts", props(c, CONTACT_MAP));
async function opGetContact(c, { api }) {
  if (!c.contactId && !c.email) return skip("getContact", "'contactId' or 'email' is required.");
  if (c.email && !c.contactId) {
    const r = await api.post("/crm/v3/objects/contacts/search", {
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: c.email }] }],
      properties: PROPS_BY_OBJECT.contacts.split(","),
    });
    const hit = r.data.results?.[0];
    return hit ? { success: true, found: true, ...flat(hit) } : { success: true, found: false };
  }
  return getObject(api, "contacts", c.contactId);
}
function opUpdateContact(c, { api }) {
  const e = need(c, "contactId", "updateContact"); if (e) return e;
  return updateObject(api, "contacts", c.contactId, props(c, CONTACT_MAP));
}
function opDeleteContact(c, { api }) {
  const e = need(c, "contactId", "deleteContact"); if (e) return e;
  return deleteObject(api, "contacts", c.contactId);
}
const opListContacts = (c, { api }) => listObjects(api, "contacts", c);
const opSearchContacts = (c, { api }) => searchObjects(api, "contacts", c);

/* ---------------- Companies ---------------- */

const COMPANY_MAP = {
  companyName: "name", domain: "domain", phone: "phone", city: "city", country: "country",
  industry: "industry", website: "website", numEmployees: "numberofemployees", ownerId: "hubspot_owner_id",
};
function opCreateCompany(c, { api }) {
  const e = need(c, "companyName", "createCompany"); if (e) return e;
  return createObject(api, "companies", props(c, COMPANY_MAP));
}
function opGetCompany(c, { api }) {
  const e = need(c, "companyId", "getCompany"); if (e) return e;
  return getObject(api, "companies", c.companyId);
}
function opUpdateCompany(c, { api }) {
  const e = need(c, "companyId", "updateCompany"); if (e) return e;
  return updateObject(api, "companies", c.companyId, props(c, COMPANY_MAP));
}
function opDeleteCompany(c, { api }) {
  const e = need(c, "companyId", "deleteCompany"); if (e) return e;
  return deleteObject(api, "companies", c.companyId);
}
const opListCompanies = (c, { api }) => listObjects(api, "companies", c);
const opSearchCompanies = (c, { api }) => searchObjects(api, "companies", c);

/* ---------------- Deals ---------------- */

const DEAL_MAP = {
  dealName: "dealname", amount: "amount", stage: "dealstage", closeDate: "closedate",
  pipeline: "pipeline", ownerId: "hubspot_owner_id",
};
function opCreateDeal(c, { api }) {
  const e = need(c, "dealName", "createDeal"); if (e) return e;
  return createObject(api, "deals", props(c, DEAL_MAP));
}
function opGetDeal(c, { api }) {
  const e = need(c, "dealId", "getDeal"); if (e) return e;
  return getObject(api, "deals", c.dealId);
}
function opUpdateDeal(c, { api }) {
  const e = need(c, "dealId", "updateDeal"); if (e) return e;
  return updateObject(api, "deals", c.dealId, props(c, DEAL_MAP));
}
function opDeleteDeal(c, { api }) {
  const e = need(c, "dealId", "deleteDeal"); if (e) return e;
  return deleteObject(api, "deals", c.dealId);
}
const opListDeals = (c, { api }) => listObjects(api, "deals", c);
const opSearchDeals = (c, { api }) => searchObjects(api, "deals", c);

/* ---------------- Tickets ---------------- */

const TICKET_MAP = {
  subject: "subject", content: "content", pipeline: "hs_pipeline", stage: "hs_pipeline_stage",
  priority: "hs_ticket_priority", ownerId: "hubspot_owner_id",
};
function opCreateTicket(c, { api }) {
  const e = need(c, "subject", "createTicket"); if (e) return e;
  return createObject(api, "tickets", props(c, TICKET_MAP));
}
function opGetTicket(c, { api }) {
  const e = need(c, "ticketId", "getTicket"); if (e) return e;
  return getObject(api, "tickets", c.ticketId);
}
function opUpdateTicket(c, { api }) {
  const e = need(c, "ticketId", "updateTicket"); if (e) return e;
  return updateObject(api, "tickets", c.ticketId, props(c, TICKET_MAP));
}
function opDeleteTicket(c, { api }) {
  const e = need(c, "ticketId", "deleteTicket"); if (e) return e;
  return deleteObject(api, "tickets", c.ticketId);
}
const opListTickets = (c, { api }) => listObjects(api, "tickets", c);

/* ---------------- Products & Line Items ---------------- */

function opCreateProduct(c, { api }) {
  const e = need(c, "name", "createProduct"); if (e) return e;
  return createObject(api, "products", props(c, { name: "name", price: "price", description: "description", sku: "hs_sku" }));
}
function opGetProduct(c, { api }) {
  const e = need(c, "productId", "getProduct"); if (e) return e;
  return getObject(api, "products", c.productId);
}
const opListProducts = (c, { api }) => listObjects(api, "products", c);
function opCreateLineItem(c, { api }) {
  const e = need(c, "name", "createLineItem"); if (e) return e;
  return createObject(api, "line_items", props(c, { name: "name", quantity: "quantity", price: "price", productId: "hs_product_id" }));
}

/* ---------------- Engagements: Notes & Tasks ---------------- */

function engagementAssociations(c, noteType) {
  const a = [];
  const map = noteType === "task"
    ? { contactId: 204, dealId: 216, companyId: 192, ticketId: 228 }
    : { contactId: 202, dealId: 214, companyId: 190, ticketId: 226 };
  for (const [k, typeId] of Object.entries(map)) {
    if (c[k]) a.push({ to: { id: c[k] }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }] });
  }
  return a;
}
function opCreateNote(c, { api }) {
  const e = need(c, "body", "createNote"); if (e) return e;
  const properties = { hs_note_body: c.body, hs_timestamp: c.timestamp || new Date().toISOString() };
  return createObject(api, "notes", properties, engagementAssociations(c, "note"));
}
function opCreateTask(c, { api }) {
  const e = need(c, "subject", "createTask"); if (e) return e;
  const properties = {
    hs_task_subject: c.subject, hs_task_body: c.body, hs_timestamp: c.timestamp || new Date().toISOString(),
    hs_task_status: c.status || "NOT_STARTED", hs_task_priority: c.priority,
    hubspot_owner_id: c.ownerId ? String(c.ownerId) : undefined,
  };
  return createObject(api, "tasks", properties, engagementAssociations(c, "task"));
}

/* ---------------- Associations ---------------- */

async function opAssociateObjects(c, { api }) {
  for (const k of ["fromType", "fromId", "toType", "toId"]) {
    const e = need(c, k, "associateObjects"); if (e) return e;
  }
  await api.put(
    `/crm/v4/objects/${enc(c.fromType)}/${enc(c.fromId)}/associations/default/${enc(c.toType)}/${enc(c.toId)}`,
    {}
  );
  return { success: true, associated: true, from: `${c.fromType}/${c.fromId}`, to: `${c.toType}/${c.toId}` };
}
async function opListAssociations(c, { api }) {
  for (const k of ["fromType", "fromId", "toType"]) {
    const e = need(c, k, "listAssociations"); if (e) return e;
  }
  const r = await api.get(`/crm/v4/objects/${enc(c.fromType)}/${enc(c.fromId)}/associations/${enc(c.toType)}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}

/* ---------------- Pipelines, Owners, Properties ---------------- */

async function opListPipelines(c, { api }) {
  const r = await api.get(`/crm/v3/pipelines/${enc(c.objectType || "deals")}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}
async function opListOwners(c, { api }) {
  const r = await api.get("/crm/v3/owners", { params: { limit: 100, email: c.email || undefined } });
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}
async function opGetOwner(c, { api }) {
  const e = need(c, "ownerId", "getOwner"); if (e) return e;
  const r = await api.get(`/crm/v3/owners/${enc(c.ownerId)}`);
  return { success: true, ...r.data };
}
async function opListProperties(c, { api }) {
  const r = await api.get(`/crm/v3/properties/${enc(c.objectType || "contacts")}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}

/* ---------------- Lists ---------------- */

async function opAddToList(c, { api }) {
  let e = need(c, "listId", "addToList"); if (e) return e;
  e = need(c, "contactId", "addToList"); if (e) return e;
  await api.put(`/crm/v3/lists/${enc(c.listId)}/memberships/add`, csv(c.contactId).map(Number));
  return { success: true, added: true, listId: c.listId };
}
async function opRemoveFromList(c, { api }) {
  let e = need(c, "listId", "removeFromList"); if (e) return e;
  e = need(c, "contactId", "removeFromList"); if (e) return e;
  await api.put(`/crm/v3/lists/${enc(c.listId)}/memberships/remove`, csv(c.contactId).map(Number));
  return { success: true, removed: true, listId: c.listId };
}

const OPERATIONS = {
  createContact: opCreateContact, getContact: opGetContact, updateContact: opUpdateContact,
  deleteContact: opDeleteContact, listContacts: opListContacts, searchContacts: opSearchContacts,
  createCompany: opCreateCompany, getCompany: opGetCompany, updateCompany: opUpdateCompany,
  deleteCompany: opDeleteCompany, listCompanies: opListCompanies, searchCompanies: opSearchCompanies,
  createDeal: opCreateDeal, getDeal: opGetDeal, updateDeal: opUpdateDeal,
  deleteDeal: opDeleteDeal, listDeals: opListDeals, searchDeals: opSearchDeals,
  createTicket: opCreateTicket, getTicket: opGetTicket, updateTicket: opUpdateTicket,
  deleteTicket: opDeleteTicket, listTickets: opListTickets,
  createProduct: opCreateProduct, getProduct: opGetProduct, listProducts: opListProducts,
  createLineItem: opCreateLineItem,
  createNote: opCreateNote, addNote: opCreateNote, createTask: opCreateTask,
  associateObjects: opAssociateObjects, listAssociations: opListAssociations,
  listPipelines: opListPipelines, listOwners: opListOwners, getOwner: opGetOwner,
  listProperties: opListProperties, addToList: opAddToList, removeFromList: opRemoveFromList,
};

function handleError(err) {
  if (err.message?.startsWith("HubSpot")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.errors?.[0]?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`HubSpot: Auth failed — ${msg}. Check your Private App token & scopes.`);
  if (status === 404) throw new Error(`HubSpot: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`HubSpot: Bad request — ${msg}.`);
  if (status === 409) throw new Error(`HubSpot: Conflict — ${msg}. A record with this value may already exist.`);
  if (status === 429) throw new Error(`HubSpot: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`HubSpot: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`HubSpot: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "createContact";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `HubSpot: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "HubSpot: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "HubSpot");
    } catch (e) {
      return { success: false, error: `HubSpot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = axios.create({
      baseURL: BASE,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });

    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};

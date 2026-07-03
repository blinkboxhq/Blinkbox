/**
 * HubSpot — Contact resource. CRUD + search (get-by-email fallback preserved
 * verbatim) plus batch create/read. Handlers receive (config, { api }).
 */
import {
  skip, need, props, flat, lim,
  createObject, getObject, updateObject, deleteObject, listObjects, searchObjects,
  PROPS_BY_OBJECT,
} from "../GenericFunctions.js";

export const CONTACT_MAP = {
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

async function opBatchCreateContacts(c, { api }) {
  const e = need(c, "records", "batchCreateContacts"); if (e) return e;
  const raw = typeof c.records === "string" ? JSON.parse(c.records) : c.records;
  const inputs = (Array.isArray(raw) ? raw : []).map((rec) => ({ properties: rec }));
  const r = await api.post("/crm/v3/objects/contacts/batch/create", { inputs });
  return { success: true, data: (r.data.results ?? []).map(flat), count: r.data.results?.length ?? 0 };
}

async function opBatchReadContacts(c, { api }) {
  const e = need(c, "contactIds", "batchReadContacts"); if (e) return e;
  const ids = Array.isArray(c.contactIds) ? c.contactIds : String(c.contactIds).split(",").map((s) => s.trim()).filter(Boolean);
  const r = await api.post("/crm/v3/objects/contacts/batch/read", {
    properties: PROPS_BY_OBJECT.contacts.split(","),
    inputs: ids.map((id) => ({ id })),
  });
  return { success: true, data: (r.data.results ?? []).map(flat), count: r.data.results?.length ?? 0 };
}

export const contactOperations = {
  createContact: opCreateContact,
  getContact: opGetContact,
  updateContact: opUpdateContact,
  deleteContact: opDeleteContact,
  listContacts: opListContacts,
  searchContacts: opSearchContacts,
  batchCreateContacts: opBatchCreateContacts,
  batchReadContacts: opBatchReadContacts,
};

/**
 * INTERCOM — Contact resource. list / get / search / create / update / archive
 * preserved verbatim from the monolith; deleteContact and mergeContact added
 * for parity. Handlers receive (config, { api }).
 */
import { perPage, parseJson } from "../GenericFunctions.js";

async function opListContacts(config, { api }) {
  const { data } = await api.get("/contacts", { params: { per_page: perPage(config.limit) } });
  return { success: true, contacts: data.data ?? [], total: data.total_count };
}

async function opGetContact(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom getContact: contactId required.", skipped: true };
  const { data } = await api.get(`/contacts/${config.contactId}`);
  return { success: true, ...data };
}

async function opSearchContacts(config, { api }) {
  if (!config.email && !config.query) return { success: false, error: "Intercom searchContacts: email or query required.", skipped: true };
  const body = {
    query: config.email
      ? { field: "email", operator: "=", value: config.email }
      : { field: "name", operator: "~", value: config.query },
    pagination: { per_page: perPage(config.limit) },
  };
  const { data } = await api.post("/contacts/search", body);
  return { success: true, contacts: data.data ?? [], total: data.total_count };
}

async function opCreateContact(config, { api }) {
  const body = { role: config.role || "user" };
  if (config.email) body.email = config.email;
  if (config.name) body.name = config.name;
  if (config.phone) body.phone = config.phone;
  if (config.externalId) body.external_id = config.externalId;
  const attrs = parseJson(config.customAttributes, "customAttributes");
  if (attrs) body.custom_attributes = attrs;
  const { data } = await api.post("/contacts", body);
  return { success: true, id: data.id, email: data.email, name: data.name, role: data.role };
}

async function opUpdateContact(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom updateContact: contactId required.", skipped: true };
  const body = {};
  if (config.email) body.email = config.email;
  if (config.name) body.name = config.name;
  if (config.role) body.role = config.role;
  if (config.phone) body.phone = config.phone;
  const attrs = parseJson(config.customAttributes, "customAttributes");
  if (attrs) body.custom_attributes = attrs;
  const { data } = await api.put(`/contacts/${config.contactId}`, body);
  return { success: true, id: data.id, email: data.email, name: data.name };
}

async function opArchiveContact(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom archiveContact: contactId required.", skipped: true };
  const { data } = await api.post(`/contacts/${config.contactId}/archive`);
  return { success: true, id: data.id, archived: data.archived };
}

async function opDeleteContact(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom deleteContact: contactId required.", skipped: true };
  const { data } = await api.delete(`/contacts/${config.contactId}`);
  return { success: true, id: data.id ?? config.contactId, deleted: data.deleted ?? true };
}

async function opMergeContact(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom mergeContact: contactId (lead) required.", skipped: true };
  if (!config.intoContactId) return { success: false, error: "Intercom mergeContact: intoContactId (user to merge into) required.", skipped: true };
  const { data } = await api.post("/contacts/merge", { from: config.contactId, into: config.intoContactId });
  return { success: true, id: data.id, mergedFrom: config.contactId };
}

export const contactOperations = {
  listContacts: opListContacts,
  getContact: opGetContact,
  searchContacts: opSearchContacts,
  createContact: opCreateContact,
  updateContact: opUpdateContact,
  archiveContact: opArchiveContact,
  deleteContact: opDeleteContact,
  mergeContact: opMergeContact,
};

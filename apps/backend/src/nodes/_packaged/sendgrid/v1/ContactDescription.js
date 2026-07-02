/**
 * SendGrid — Marketing Contacts operations: add/upsert, get, search, delete.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opAddContact(config, token) {
  if (!config.email) return { success: false, error: "SendGrid addContact: 'email' is required — configure this field.", skipped: true };
  const contact = { email: config.email };
  if (config.firstName) contact.first_name = config.firstName;
  if (config.lastName) contact.last_name = config.lastName;
  if (config.customFields && typeof config.customFields === "object") {
    contact.custom_fields = config.customFields;
  }

  const body = { contacts: [contact] };
  if (config.listIds) body.list_ids = Array.isArray(config.listIds) ? config.listIds : [config.listIds];

  const response = await axios.put(`${BASE}/marketing/contacts`, body, { headers: auth(token), timeout: 15000 });
  return { jobId: response.data.job_id, added: true };
}

async function opGetContact(config, token) {
  if (!config.contactId && !config.email) return { success: false, error: "SendGrid getContact: 'contactId' or 'email' is required.", skipped: true };
  if (config.contactId) {
    const response = await axios.get(`${BASE}/marketing/contacts/${encodeURIComponent(config.contactId)}`, { headers: auth(token), timeout: 10000 });
    return { contact: response.data };
  }
  const response = await axios.post(`${BASE}/marketing/contacts/search/emails`, { emails: [config.email] }, { headers: auth(token), timeout: 10000 });
  const match = response.data.result?.[config.email]?.contact;
  if (!match) return { success: false, error: `SendGrid getContact: no contact found for ${config.email}.`, skipped: true };
  return { contact: match };
}

async function opSearchContacts(config, token) {
  if (!config.query) return { success: false, error: "SendGrid searchContacts: 'query' (SGQL) is required, e.g. email LIKE 'a@b.com'.", skipped: true };
  const response = await axios.post(`${BASE}/marketing/contacts/search`, { query: config.query }, { headers: auth(token), timeout: 15000 });
  return { contacts: response.data.result || [], total: response.data.contact_count || (response.data.result || []).length };
}

async function opDeleteContact(config, token) {
  if (!config.contactId) return { success: false, error: "SendGrid deleteContact: 'contactId' is required.", skipped: true };
  const response = await axios.delete(`${BASE}/marketing/contacts`, { headers: auth(token), params: { ids: config.contactId }, timeout: 10000 });
  return { jobId: response.data.job_id, deleted: true };
}

export const contactOperations = {
  addContact: opAddContact,
  getContact: opGetContact,
  searchContacts: opSearchContacts,
  deleteContact: opDeleteContact,
};

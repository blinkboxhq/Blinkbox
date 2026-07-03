/**
 * OUTLOOK — Contact resource. createContact preserved verbatim from the
 * monolith; getContact, listContacts, updateContact and deleteContact added
 * for parity. Handlers receive (config, client).
 */
import { num } from "../GenericFunctions.js";

function mapContact(c) {
  return {
    id: c.id,
    displayName: c.displayName,
    givenName: c.givenName,
    surname: c.surname,
    emails: (c.emailAddresses || []).map((e) => e.address),
    mobilePhone: c.mobilePhone,
    companyName: c.companyName,
  };
}

async function opCreateContact(config, client) {
  const { firstName, lastName, email } = config;
  if (!firstName && !lastName) return { success: false, error: "Outlook createContact: at least first or last name is required.", skipped: true };

  const body = { givenName: firstName || "", surname: lastName || "" };
  if (email) body.emailAddresses = [{ address: email, name: `${firstName || ""} ${lastName || ""}`.trim() }];
  if (config.mobilePhone) body.mobilePhone = config.mobilePhone;
  if (config.companyName) body.companyName = config.companyName;

  const res = await client.post(`/me/contacts`, body);
  return { success: true, id: res.data.id, displayName: res.data.displayName };
}

async function opGetContact(config, client) {
  const { contactId } = config;
  if (!contactId) return { success: false, error: "Outlook getContact: 'contactId' is required.", skipped: true };
  const res = await client.get(`/me/contacts/${client.enc(contactId)}`);
  return { success: true, ...mapContact(res.data) };
}

async function opListContacts(config, client) {
  const params = { $top: num(config.limit, 50), $orderby: "displayName" };
  if (config.filter) params.$filter = config.filter;
  if (config.search) params.$search = `"${config.search}"`;
  const res = await client.get(`/me/contacts`, params);
  return { success: true, count: res.data.value.length, contacts: res.data.value.map(mapContact) };
}

async function opUpdateContact(config, client) {
  const { contactId } = config;
  if (!contactId) return { success: false, error: "Outlook updateContact: 'contactId' is required.", skipped: true };
  const patch = {};
  if (config.firstName !== undefined) patch.givenName = config.firstName;
  if (config.lastName !== undefined) patch.surname = config.lastName;
  if (config.email) patch.emailAddresses = [{ address: config.email }];
  if (config.mobilePhone !== undefined) patch.mobilePhone = config.mobilePhone;
  if (config.companyName !== undefined) patch.companyName = config.companyName;
  if (!Object.keys(patch).length) return { success: false, error: "Outlook updateContact: no fields to update.", skipped: true };
  const res = await client.patch(`/me/contacts/${client.enc(contactId)}`, patch);
  return { success: true, id: res.data.id, displayName: res.data.displayName };
}

async function opDeleteContact(config, client) {
  const { contactId } = config;
  if (!contactId) return { success: false, error: "Outlook deleteContact: 'contactId' is required.", skipped: true };
  await client.del(`/me/contacts/${client.enc(contactId)}`);
  return { success: true, deleted: true, contactId };
}

export const contactOperations = {
  createContact: opCreateContact,
  getContact: opGetContact,
  listContacts: opListContacts,
  updateContact: opUpdateContact,
  deleteContact: opDeleteContact,
};

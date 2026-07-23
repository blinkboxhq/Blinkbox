/**
 * RESEND — Audience, Contact & Broadcast resources. New for parity with the
 * Resend API: createAudience, getAudience, listAudiences, deleteAudience,
 * createContact, getContact, updateContact, listContacts, deleteContact,
 * createBroadcast, sendBroadcast. Handlers receive (config, apiKey).
 */
import axios from "axios";
import { BASE, headers, asArray } from "../GenericFunctions.js";

async function opCreateAudience(config, apiKey) {
  if (!config.name) return { success: false, error: "Resend createAudience: 'name' is required — configure this field.", skipped: true };
  const res = await axios.post(`${BASE}/audiences`, { name: config.name }, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opGetAudience(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend getAudience: 'audienceId' is required — configure this field.", skipped: true };
  const res = await axios.get(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}`, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opListAudiences(config, apiKey) {
  const res = await axios.get(`${BASE}/audiences`, { headers: headers(apiKey), timeout: 120000 });
  return { data: res.data.data ?? [] };
}

async function opDeleteAudience(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend deleteAudience: 'audienceId' is required — configure this field.", skipped: true };
  await axios.delete(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}`, { headers: headers(apiKey), timeout: 120000 });
  return { deleted: true, audienceId: config.audienceId };
}

async function opCreateContact(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend createContact: 'audienceId' is required — configure this field.", skipped: true };
  if (!config.email) return { success: false, error: "Resend createContact: 'email' is required — configure this field.", skipped: true };
  const body = { email: config.email };
  if (config.firstName) body.first_name = config.firstName;
  if (config.lastName) body.last_name = config.lastName;
  if (config.unsubscribed !== undefined) body.unsubscribed = config.unsubscribed === true;
  const res = await axios.post(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}/contacts`, body, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opGetContact(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend getContact: 'audienceId' is required — configure this field.", skipped: true };
  const idOrEmail = config.contactId || config.email;
  if (!idOrEmail) return { success: false, error: "Resend getContact: 'contactId' or 'email' is required — configure this field.", skipped: true };
  const res = await axios.get(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}/contacts/${encodeURIComponent(idOrEmail)}`, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opUpdateContact(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend updateContact: 'audienceId' is required — configure this field.", skipped: true };
  const idOrEmail = config.contactId || config.email;
  if (!idOrEmail) return { success: false, error: "Resend updateContact: 'contactId' or 'email' is required — configure this field.", skipped: true };
  const body = {};
  if (config.firstName !== undefined) body.first_name = config.firstName;
  if (config.lastName !== undefined) body.last_name = config.lastName;
  if (config.unsubscribed !== undefined) body.unsubscribed = config.unsubscribed === true;
  const res = await axios.patch(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}/contacts/${encodeURIComponent(idOrEmail)}`, body, { headers: headers(apiKey), timeout: 120000 });
  return { updated: true, ...res.data };
}

async function opListContacts(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend listContacts: 'audienceId' is required — configure this field.", skipped: true };
  const res = await axios.get(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}/contacts`, { headers: headers(apiKey), timeout: 120000 });
  return { data: res.data.data ?? [] };
}

async function opDeleteContact(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend deleteContact: 'audienceId' is required — configure this field.", skipped: true };
  const idOrEmail = config.contactId || config.email;
  if (!idOrEmail) return { success: false, error: "Resend deleteContact: 'contactId' or 'email' is required — configure this field.", skipped: true };
  await axios.delete(`${BASE}/audiences/${encodeURIComponent(config.audienceId)}/contacts/${encodeURIComponent(idOrEmail)}`, { headers: headers(apiKey), timeout: 120000 });
  return { deleted: true, audienceId: config.audienceId, contact: idOrEmail };
}

async function opCreateBroadcast(config, apiKey) {
  if (!config.audienceId) return { success: false, error: "Resend createBroadcast: 'audienceId' is required — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "Resend createBroadcast: 'from' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "Resend createBroadcast: 'subject' is required — configure this field.", skipped: true };
  const body = { audience_id: config.audienceId, from: config.from, subject: config.subject };
  if (config.html) body.html = config.html;
  else if (config.text) body.text = config.text;
  if (config.name) body.name = config.name;
  if (config.replyTo) body.reply_to = config.replyTo;
  const res = await axios.post(`${BASE}/broadcasts`, body, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opSendBroadcast(config, apiKey) {
  if (!config.broadcastId) return { success: false, error: "Resend sendBroadcast: 'broadcastId' is required — configure this field.", skipped: true };
  const body = {};
  if (config.scheduledAt) body.scheduled_at = config.scheduledAt;
  const res = await axios.post(`${BASE}/broadcasts/${encodeURIComponent(config.broadcastId)}/send`, body, { headers: headers(apiKey), timeout: 120000 });
  return { sent: true, ...res.data };
}

export const audienceOperations = {
  createAudience: opCreateAudience,
  getAudience: opGetAudience,
  listAudiences: opListAudiences,
  deleteAudience: opDeleteAudience,
  createContact: opCreateContact,
  getContact: opGetContact,
  updateContact: opUpdateContact,
  listContacts: opListContacts,
  deleteContact: opDeleteContact,
  createBroadcast: opCreateBroadcast,
  sendBroadcast: opSendBroadcast,
};

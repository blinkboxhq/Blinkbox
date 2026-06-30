/**
 * SENDGRID NODE
 *
 * Operations:
 *   sendEmail    — Send a single transactional email (default)
 *   sendTemplate — Send using a Dynamic Template
 *   sendBulk     — Send to multiple recipients (personalizations)
 *   addContact   — Add or update a contact in Marketing Contacts
 *
 * Auth: SendGrid API Key in vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.sendgrid.com/v3";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "SendGrid");
}

function handleError(err) {
  if (err.message.startsWith("SendGrid")) throw err;
  const status = err.response?.status;
  const errors = err.response?.data?.errors;
  const msg = errors?.[0]?.message || err.message;
  if (status === 401 || status === 403) throw new Error("SendGrid: Invalid API key or insufficient permissions.");
  if (status === 400) throw new Error(`SendGrid: ${msg}`);
  if (status === 429) throw new Error("SendGrid: Rate limit exceeded. Retry later.");
  throw new Error(`SendGrid failed: ${status || err.code} — ${err.message}`);
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function parseAddress(addr) {
  // Accept "Name <email>" or plain "email"
  const match = String(addr).match(/^(.*?)<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: addr.trim() };
}

async function opSendEmail(config, token) {
  if (!config.to) return { success: false, error: "SendGrid sendEmail: 'to' is required — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendEmail: 'from' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "SendGrid sendEmail: 'subject' is required — configure this field.", skipped: true };
  if (!config.body && !config.html) return { success: false, error: "SendGrid sendEmail: 'body' or 'html' is required — configure this field.", skipped: true };

  const toList = String(config.to).split(",").map((a) => parseAddress(a.trim()));
  const payload = {
    personalizations: [{ to: toList }],
    from: parseAddress(config.from),
    subject: config.subject,
    content: config.html
      ? [{ type: "text/html", value: config.html }]
      : [{ type: "text/plain", value: config.body }],
  };
  if (config.replyTo) payload.reply_to = parseAddress(config.replyTo);

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 15000 });
  const messageId = response.headers["x-message-id"] || null;
  return { sent: true, messageId, statusCode: response.status };
}

async function opSendTemplate(config, token) {
  if (!config.to) return { success: false, error: "SendGrid sendTemplate: 'to' is required — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendTemplate: 'from' is required — configure this field.", skipped: true };
  if (!config.templateId) return { success: false, error: "SendGrid sendTemplate: 'templateId' is required — configure this field.", skipped: true };

  const toList = String(config.to).split(",").map((a) => parseAddress(a.trim()));
  const dynamicData = typeof config.dynamicData === "string" ? (() => { try { return JSON.parse(config.dynamicData); } catch { throw new Error("SendGrid sendTemplate: 'dynamicData' is not valid JSON."); } })() : (config.dynamicData || {});
  const payload = {
    personalizations: [{ to: toList, dynamic_template_data: dynamicData }],
    from: parseAddress(config.from),
    template_id: config.templateId,
  };
  if (config.subject) payload.subject = config.subject;
  if (config.replyTo) payload.reply_to = parseAddress(config.replyTo);

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 15000 });
  return { sent: true, messageId: response.headers["x-message-id"] || null, statusCode: response.status };
}

async function opSendBulk(config, token) {
  // config.recipients: array of { email, name?, data? } or JSON string
  const recipients = typeof config.recipients === "string" ? (() => { try { return JSON.parse(config.recipients); } catch { throw new Error("SendGrid sendBulk: 'recipients' is not valid JSON."); } })() : config.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0)
    return { success: false, error: "SendGrid sendBulk: 'recipients' must be a non-empty array of { email, name?, data? } — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendBulk: 'from' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "SendGrid sendBulk: 'subject' is required — configure this field.", skipped: true };
  if (!config.body && !config.html && !config.templateId) return { success: false, error: "SendGrid sendBulk: 'body', 'html', or 'templateId' is required — configure this field.", skipped: true };

  const personalizations = recipients.map((r) => ({
    to: [{ email: r.email, name: r.name }],
    ...(r.data ? { dynamic_template_data: r.data } : {}),
  }));

  const payload = {
    personalizations,
    from: parseAddress(config.from),
    subject: config.subject,
  };

  if (config.templateId) {
    payload.template_id = config.templateId;
  } else {
    payload.content = config.html
      ? [{ type: "text/html", value: config.html }]
      : [{ type: "text/plain", value: config.body }];
  }

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 20000 });
  return { sent: true, recipientCount: recipients.length, statusCode: response.status };
}

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

async function opSearchContacts(config, token) {
  if (!config.query) return { success: false, error: "SendGrid searchContacts: 'query' (SGQL) is required, e.g. email LIKE 'a@b.com'.", skipped: true };
  const response = await axios.post(`${BASE}/marketing/contacts/search`, { query: config.query }, { headers: auth(token), timeout: 15000 });
  return { contacts: response.data.result || [], total: response.data.contact_count || (response.data.result || []).length };
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

async function opDeleteContact(config, token) {
  if (!config.contactId) return { success: false, error: "SendGrid deleteContact: 'contactId' is required.", skipped: true };
  const response = await axios.delete(`${BASE}/marketing/contacts`, { headers: auth(token), params: { ids: config.contactId }, timeout: 10000 });
  return { jobId: response.data.job_id, deleted: true };
}

async function opListLists(config, token) {
  const response = await axios.get(`${BASE}/marketing/lists`, { headers: auth(token), params: { page_size: Math.min(config.maxResults || 50, 1000) }, timeout: 15000 });
  return { lists: response.data.result || [] };
}

async function opCreateList(config, token) {
  if (!config.listName) return { success: false, error: "SendGrid createList: 'listName' is required.", skipped: true };
  const response = await axios.post(`${BASE}/marketing/lists`, { name: config.listName }, { headers: auth(token), timeout: 10000 });
  return { listId: response.data.id, name: response.data.name };
}

async function opDeleteList(config, token) {
  if (!config.listId) return { success: false, error: "SendGrid deleteList: 'listId' is required.", skipped: true };
  await axios.delete(`${BASE}/marketing/lists/${encodeURIComponent(config.listId)}`, { headers: auth(token), params: { delete_contacts: !!config.deleteContacts }, timeout: 10000 });
  return { listId: config.listId, deleted: true };
}

async function opListTemplates(config, token) {
  const response = await axios.get(`${BASE}/templates`, {
    headers: auth(token),
    params: { generations: "dynamic", page_size: Math.min(config.maxResults || 50, 200) },
    timeout: 15000,
  });
  return { templates: response.data.result || response.data.templates || [] };
}

async function opGetTemplate(config, token) {
  if (!config.templateId) return { success: false, error: "SendGrid getTemplate: 'templateId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/templates/${encodeURIComponent(config.templateId)}`, { headers: auth(token), timeout: 10000 });
  return { template: response.data };
}

async function opValidateEmail(config, token) {
  if (!config.email) return { success: false, error: "SendGrid validateEmail: 'email' is required.", skipped: true };
  const response = await axios.post(`${BASE}/validations/email`, { email: config.email, source: config.source || "blinkbox" }, { headers: auth(token), timeout: 15000 });
  const r = response.data.result || {};
  return { verdict: r.verdict, score: r.score, email: r.email, suggestion: r.suggestion, checks: r.checks };
}

async function opGetStats(config, token) {
  if (!config.startDate) return { success: false, error: "SendGrid getStats: 'startDate' (YYYY-MM-DD) is required.", skipped: true };
  const params = { start_date: config.startDate };
  if (config.endDate) params.end_date = config.endDate;
  if (config.aggregatedBy) params.aggregated_by = config.aggregatedBy;
  const response = await axios.get(`${BASE}/stats`, { headers: auth(token), params, timeout: 15000 });
  return { stats: response.data || [] };
}

async function opListSuppressions(config, token) {
  const type = config.suppressionType || "bounces";
  const valid = ["bounces", "blocks", "spam_reports", "invalid_emails", "unsubscribes"];
  if (!valid.includes(type)) throw new Error(`SendGrid listSuppressions: 'suppressionType' must be one of ${valid.join(", ")}.`);
  const path = type === "unsubscribes" ? "/suppression/unsubscribes" : `/suppression/${type}`;
  const response = await axios.get(`${BASE}${path}`, { headers: auth(token), timeout: 15000 });
  return { type, suppressions: response.data || [] };
}

async function opDeleteSuppression(config, token) {
  const type = config.suppressionType || "bounces";
  if (!config.email) return { success: false, error: "SendGrid deleteSuppression: 'email' is required.", skipped: true };
  const path = type === "unsubscribes" ? "/asm/suppressions/global" : `/suppression/${type}`;
  await axios.delete(`${BASE}${path}/${encodeURIComponent(config.email)}`, { headers: auth(token), timeout: 10000 });
  return { email: config.email, type, removed: true };
}

const OPERATIONS = {
  sendEmail: opSendEmail,
  sendTemplate: opSendTemplate,
  sendBulk: opSendBulk,
  addContact: opAddContact,
  getContact: opGetContact,
  searchContacts: opSearchContacts,
  deleteContact: opDeleteContact,
  listLists: opListLists,
  createList: opCreateList,
  deleteList: opDeleteList,
  listTemplates: opListTemplates,
  getTemplate: opGetTemplate,
  validateEmail: opValidateEmail,
  getStats: opGetStats,
  listSuppressions: opListSuppressions,
  deleteSuppression: opDeleteSuppression,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendEmail";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`SendGrid: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("SendGrid: No credential configured — add your SendGrid API key to the Vault.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

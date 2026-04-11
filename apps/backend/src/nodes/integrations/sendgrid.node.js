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
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.sendgrid.com/v3";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "SendGrid");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
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
  if (!config.to) throw new Error("SendGrid sendEmail: 'to' is required.");
  if (!config.from) throw new Error("SendGrid sendEmail: 'from' is required.");
  if (!config.subject) throw new Error("SendGrid sendEmail: 'subject' is required.");
  if (!config.body && !config.html) throw new Error("SendGrid sendEmail: 'body' or 'html' is required.");

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
  if (!config.to) throw new Error("SendGrid sendTemplate: 'to' is required.");
  if (!config.from) throw new Error("SendGrid sendTemplate: 'from' is required.");
  if (!config.templateId) throw new Error("SendGrid sendTemplate: 'templateId' is required.");

  const toList = String(config.to).split(",").map((a) => parseAddress(a.trim()));
  const dynamicData = typeof config.dynamicData === "string" ? JSON.parse(config.dynamicData) : (config.dynamicData || {});
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
  const recipients = typeof config.recipients === "string" ? JSON.parse(config.recipients) : config.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0)
    throw new Error("SendGrid sendBulk: 'recipients' must be a non-empty array of { email, name?, data? }.");
  if (!config.from) throw new Error("SendGrid sendBulk: 'from' is required.");
  if (!config.subject) throw new Error("SendGrid sendBulk: 'subject' is required.");
  if (!config.body && !config.html && !config.templateId) throw new Error("SendGrid sendBulk: 'body', 'html', or 'templateId' is required.");

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
  if (!config.email) throw new Error("SendGrid addContact: 'email' is required.");
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

const OPERATIONS = {
  sendEmail: opSendEmail,
  sendTemplate: opSendTemplate,
  sendBulk: opSendBulk,
  addContact: opAddContact,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendEmail";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`SendGrid: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);
    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};

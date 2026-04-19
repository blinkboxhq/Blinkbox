/**
 * RESEND NODE
 * Operations: sendEmail, sendBatch, getEmail, cancelEmail
 */
import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.resend.com";

async function getApiKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Resend");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.response?.status === 401) throw new Error("Resend: Invalid API key.");
  if (err.response?.status === 422) throw new Error(`Resend: ${err.response?.data?.message || "Validation error."}`);
  if (err.response?.status === 429) throw new Error("Resend: Rate limit exceeded.");
  throw new Error(`Resend failed: ${err.response?.status || err.code} — ${err.message}`);
}

function headers(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function opSendEmail(config, apiKey) {
  if (!config.from) throw new Error("Resend sendEmail: 'from' is required.");
  if (!config.to) throw new Error("Resend sendEmail: 'to' is required.");
  if (!config.subject) throw new Error("Resend sendEmail: 'subject' is required.");

  const to = Array.isArray(config.to) ? config.to : [config.to];
  const body = { from: config.from, to, subject: config.subject };

  if (config.html) body.html = config.html;
  else if (config.text) body.text = config.text;
  else throw new Error("Resend sendEmail: 'html' or 'text' is required.");

  if (config.cc) body.cc = Array.isArray(config.cc) ? config.cc : [config.cc];
  if (config.bcc) body.bcc = Array.isArray(config.bcc) ? config.bcc : [config.bcc];
  if (config.replyTo) body.reply_to = config.replyTo;
  if (config.scheduledAt) body.scheduled_at = config.scheduledAt;

  const res = await axios.post(`${BASE}/emails`, body, { headers: headers(apiKey), timeout: 15000 });
  return {
    id: res.data.id,
    from: config.from,
    to,
    subject: config.subject,
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}

async function opSendBatch(config, apiKey) {
  let emails = config.emails;
  if (typeof emails === "string") { try { emails = JSON.parse(emails); } catch { emails = []; } }
  if (!Array.isArray(emails) || emails.length === 0) throw new Error("Resend sendBatch: 'emails' must be a non-empty array.");

  const res = await axios.post(`${BASE}/emails/batch`, emails, { headers: headers(apiKey), timeout: 15000 });
  return { data: res.data.data || [], count: emails.length };
}

async function opGetEmail(config, apiKey) {
  if (!config.emailId) throw new Error("Resend getEmail: 'emailId' is required.");
  const res = await axios.get(`${BASE}/emails/${config.emailId}`, { headers: headers(apiKey), timeout: 10000 });
  return res.data;
}

async function opCancelEmail(config, apiKey) {
  if (!config.emailId) throw new Error("Resend cancelEmail: 'emailId' is required.");
  const res = await axios.post(`${BASE}/emails/${config.emailId}/cancel`, {}, { headers: headers(apiKey), timeout: 10000 });
  return { cancelled: true, ...res.data };
}

const OPERATIONS = { sendEmail: opSendEmail, sendBatch: opSendBatch, getEmail: opGetEmail, cancelEmail: opCancelEmail };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendEmail";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Resend: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};

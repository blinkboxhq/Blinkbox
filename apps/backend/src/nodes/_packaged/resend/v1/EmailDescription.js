/**
 * RESEND — Email resource. sendEmail / sendBatch / getEmail / cancelEmail
 * preserved verbatim from the monolith; updateEmail (reschedule) added for
 * parity with the Resend API. Handlers receive (config, apiKey).
 */
import axios from "axios";
import { BASE, headers, asArray, parseJson } from "../GenericFunctions.js";

async function opSendEmail(config, apiKey) {
  if (!config.from) return { success: false, error: "Resend sendEmail: 'from' is required — configure this field.", skipped: true };
  if (!config.to) return { success: false, error: "Resend sendEmail: 'to' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "Resend sendEmail: 'subject' is required — configure this field.", skipped: true };

  const to = Array.isArray(config.to) ? config.to : [config.to];
  const body = { from: config.from, to, subject: config.subject };

  if (config.html) body.html = config.html;
  else if (config.text) body.text = config.text;
  else return { success: false, error: "Resend sendEmail: 'html' or 'text' is required — configure this field.", skipped: true };

  if (config.cc) body.cc = Array.isArray(config.cc) ? config.cc : [config.cc];
  if (config.bcc) body.bcc = Array.isArray(config.bcc) ? config.bcc : [config.bcc];
  if (config.replyTo) body.reply_to = config.replyTo;
  if (config.scheduledAt) body.scheduled_at = config.scheduledAt;

  const res = await axios.post(`${BASE}/emails`, body, { headers: headers(apiKey), timeout: 120000 });
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
  if (!Array.isArray(emails) || emails.length === 0) return { success: false, error: "Resend sendBatch: 'emails' must be a non-empty array — configure this field.", skipped: true };

  const res = await axios.post(`${BASE}/emails/batch`, emails, { headers: headers(apiKey), timeout: 120000 });
  return { data: res.data.data || [], count: emails.length };
}

async function opGetEmail(config, apiKey) {
  if (!config.emailId) return { success: false, error: "Resend getEmail: 'emailId' is required — configure this field.", skipped: true };
  const res = await axios.get(`${BASE}/emails/${encodeURIComponent(config.emailId)}`, { headers: headers(apiKey), timeout: 120000 });
  return res.data;
}

async function opCancelEmail(config, apiKey) {
  if (!config.emailId) return { success: false, error: "Resend cancelEmail: 'emailId' is required — configure this field.", skipped: true };
  const res = await axios.post(`${BASE}/emails/${encodeURIComponent(config.emailId)}/cancel`, {}, { headers: headers(apiKey), timeout: 120000 });
  return { cancelled: true, ...res.data };
}

async function opUpdateEmail(config, apiKey) {
  if (!config.emailId) return { success: false, error: "Resend updateEmail: 'emailId' is required — configure this field.", skipped: true };
  if (!config.scheduledAt) return { success: false, error: "Resend updateEmail: 'scheduledAt' is required — configure this field.", skipped: true };
  const res = await axios.patch(`${BASE}/emails/${encodeURIComponent(config.emailId)}`, { scheduled_at: config.scheduledAt }, { headers: headers(apiKey), timeout: 120000 });
  return { updated: true, id: res.data?.id ?? config.emailId, scheduledAt: config.scheduledAt };
}

export const emailOperations = {
  sendEmail: opSendEmail,
  sendBatch: opSendBatch,
  getEmail: opGetEmail,
  cancelEmail: opCancelEmail,
  updateEmail: opUpdateEmail,
};

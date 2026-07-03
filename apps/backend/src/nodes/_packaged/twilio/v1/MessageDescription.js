/**
 * Twilio — Message operations: SMS/MMS/WhatsApp send, get, list, delete.
 * Handlers receive `(config, { accountSid, authToken })`.
 */
import axios from "axios";
import { BASE, encodeForm } from "../GenericFunctions.js";

async function opSendSms(config, { accountSid, authToken }) {
  if (!config.to) return { success: false, error: "Twilio sendSms: 'to' (recipient phone number) is required.", skipped: true };
  if (!config.from) return { success: false, error: "Twilio sendSms: 'from' (Twilio phone number) is required.", skipped: true };
  if (!config.body) return { success: false, error: "Twilio sendSms: 'body' (message text) is required.", skipped: true };

  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const response = await axios.post(url, encodeForm({
    To: config.to,
    From: config.from,
    Body: config.body,
  }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return {
    messageSid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    body: response.data.body,
    price: response.data.price,
  };
}

async function opSendMms(config, { accountSid, authToken }) {
  if (!config.to) return { success: false, error: "Twilio sendMms: 'to' is required.", skipped: true };
  if (!config.from) return { success: false, error: "Twilio sendMms: 'from' is required.", skipped: true };
  if (!config.mediaUrl) return { success: false, error: "Twilio sendMms: 'mediaUrl' is required.", skipped: true };
  if (!/^https?:\/\//i.test(config.mediaUrl)) throw new Error("Twilio sendMms: 'mediaUrl' must be a valid https:// URL.");
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const response = await axios.post(url, encodeForm({
    To: config.to,
    From: config.from,
    Body: config.body || "",
    MediaUrl: config.mediaUrl,
  }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return { messageSid: response.data.sid, status: response.data.status, to: response.data.to, numMedia: response.data.num_media };
}

async function opSendWhatsApp(config, { accountSid, authToken }) {
  if (!config.to) return { success: false, error: "Twilio sendWhatsApp: 'to' is required.", skipped: true };
  if (!config.from) return { success: false, error: "Twilio sendWhatsApp: 'from' (your Twilio WhatsApp number) is required.", skipped: true };
  if (!config.body) return { success: false, error: "Twilio sendWhatsApp: 'body' is required.", skipped: true };
  const fmt = (n) => (String(n).startsWith("whatsapp:") ? n : `whatsapp:${n}`);
  const payload = { To: fmt(config.to), From: fmt(config.from), Body: config.body };
  if (config.mediaUrl) payload.MediaUrl = config.mediaUrl;
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const response = await axios.post(url, encodeForm(payload), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return { messageSid: response.data.sid, status: response.data.status, to: response.data.to };
}

async function opGetMessage(config, { accountSid, authToken }) {
  if (!config.messageSid) return { success: false, error: "Twilio getMessage: 'messageSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(config.messageSid)}.json`;
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, timeout: 10000 });
  return {
    messageSid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    body: response.data.body,
    errorCode: response.data.error_code,
    price: response.data.price,
    dateSent: response.data.date_sent,
  };
}

async function opListMessages(config, { accountSid, authToken }) {
  const params = { PageSize: Math.min(config.maxResults || 20, 100) };
  if (config.to) params.To = config.to;
  if (config.from) params.From = config.from;
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, params, timeout: 15000 });
  return { messages: response.data.messages || [], count: (response.data.messages || []).length };
}

async function opDeleteMessage(config, { accountSid, authToken }) {
  if (!config.messageSid) return { success: false, error: "Twilio deleteMessage: 'messageSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(config.messageSid)}.json`;
  await axios.delete(url, { auth: { username: accountSid, password: authToken }, timeout: 10000 });
  return { messageSid: config.messageSid, deleted: true };
}

export const messageOperations = {
  sendSms: opSendSms,
  sendMms: opSendMms,
  sendWhatsApp: opSendWhatsApp,
  getMessage: opGetMessage,
  listMessages: opListMessages,
  deleteMessage: opDeleteMessage,
};

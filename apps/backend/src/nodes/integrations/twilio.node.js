/**
 * TWILIO NODE
 *
 * Operations: SMS/MMS/WhatsApp send, message get/list/delete, voice
 *   call make/get/list/hangup, Verify send/check, number lookup/list.
 *
 * Auth: Twilio Account SID + Auth Token stored as "user:pass" in vault
 * Credential format: "ACXXXXXXXX:authtoken"
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.twilio.com/2010-04-01";

async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Twilio");
  const [accountSid, authToken] = raw.split(":");
  if (!accountSid || !authToken) throw new Error("Twilio: Credential must be formatted as 'AccountSID:AuthToken'.");
  return { accountSid, authToken };
}

function handleError(err) {
  if (err.message.startsWith("Twilio")) throw err;
  const status = err.response?.status;
  const code = err.response?.data?.code;
  const msg = err.response?.data?.message;
  if (status === 401) throw new Error("Twilio: Invalid Account SID or Auth Token.");
  if (status === 400) throw new Error(`Twilio: ${msg || "Bad request"} (code ${code})`);
  if (status === 429) throw new Error("Twilio: Rate limit exceeded. Retry later.");
  throw new Error(`Twilio failed: ${status || err.code} — ${err.message}`);
}

function encodeForm(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

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

async function opMakeCall(config, { accountSid, authToken }) {
  if (!config.to) return { success: false, error: "Twilio makeCall: 'to' is required.", skipped: true };
  if (!config.from) return { success: false, error: "Twilio makeCall: 'from' is required.", skipped: true };
  if (!config.url) return { success: false, error: "Twilio makeCall: 'url' (TwiML URL) is required.", skipped: true };
  if (!/^https?:\/\//i.test(config.url)) throw new Error("Twilio makeCall: 'url' must be a valid https:// URL.");

  const callUrl = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls.json`;
  const response = await axios.post(callUrl, encodeForm({
    To: config.to,
    From: config.from,
    Url: config.url,
  }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return {
    callSid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    direction: response.data.direction,
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

async function opGetCall(config, { accountSid, authToken }) {
  if (!config.callSid) return { success: false, error: "Twilio getCall: 'callSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls/${encodeURIComponent(config.callSid)}.json`;
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, timeout: 10000 });
  return {
    callSid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    duration: response.data.duration,
    direction: response.data.direction,
    price: response.data.price,
  };
}

async function opListCalls(config, { accountSid, authToken }) {
  const params = { PageSize: Math.min(config.maxResults || 20, 100) };
  if (config.to) params.To = config.to;
  if (config.from) params.From = config.from;
  if (config.status) params.Status = config.status;
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls.json`;
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, params, timeout: 15000 });
  return { calls: response.data.calls || [], count: (response.data.calls || []).length };
}

async function opHangupCall(config, { accountSid, authToken }) {
  if (!config.callSid) return { success: false, error: "Twilio hangupCall: 'callSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls/${encodeURIComponent(config.callSid)}.json`;
  const response = await axios.post(url, encodeForm({ Status: "completed" }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });
  return { callSid: response.data.sid, status: response.data.status };
}

async function opSendVerification(config, { accountSid, authToken }) {
  if (!config.verifyServiceSid) return { success: false, error: "Twilio sendVerification: 'verifyServiceSid' (VAxxxx) is required.", skipped: true };
  if (!config.to) return { success: false, error: "Twilio sendVerification: 'to' is required.", skipped: true };
  const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.verifyServiceSid)}/Verifications`;
  const response = await axios.post(url, encodeForm({ To: config.to, Channel: config.channel || "sms" }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return { verificationSid: response.data.sid, status: response.data.status, channel: response.data.channel, to: response.data.to };
}

async function opCheckVerification(config, { accountSid, authToken }) {
  if (!config.verifyServiceSid) return { success: false, error: "Twilio checkVerification: 'verifyServiceSid' (VAxxxx) is required.", skipped: true };
  if (!config.to) return { success: false, error: "Twilio checkVerification: 'to' is required.", skipped: true };
  if (!config.code) return { success: false, error: "Twilio checkVerification: 'code' is required.", skipped: true };
  const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.verifyServiceSid)}/VerificationCheck`;
  const response = await axios.post(url, encodeForm({ To: config.to, Code: config.code }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  return { status: response.data.status, valid: response.data.valid, to: response.data.to };
}

async function opLookupNumber(config, { accountSid, authToken }) {
  if (!config.phoneNumber) return { success: false, error: "Twilio lookupNumber: 'phoneNumber' is required (E.164 format, e.g. +14155551234).", skipped: true };
  const encoded = encodeURIComponent(config.phoneNumber);
  const url = `https://lookups.twilio.com/v1/PhoneNumbers/${encoded}`;
  const response = await axios.get(url, {
    auth: { username: accountSid, password: authToken },
    params: { Type: "carrier" },
    timeout: 10000,
  });
  return {
    phoneNumber: response.data.phone_number,
    nationalFormat: response.data.national_format,
    countryCode: response.data.country_code,
    carrier: response.data.carrier,
  };
}

async function opListNumbers(config, { accountSid, authToken }) {
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers.json`;
  const response = await axios.get(url, {
    auth: { username: accountSid, password: authToken },
    params: { PageSize: Math.min(config.maxResults || 20, 100) },
    timeout: 15000,
  });
  return {
    numbers: (response.data.incoming_phone_numbers || []).map((n) => ({
      sid: n.sid, phoneNumber: n.phone_number, friendlyName: n.friendly_name,
      capabilities: n.capabilities,
    })),
  };
}

const OPERATIONS = {
  sendSms: opSendSms,
  sendMms: opSendMms,
  sendWhatsApp: opSendWhatsApp,
  getMessage: opGetMessage,
  listMessages: opListMessages,
  deleteMessage: opDeleteMessage,
  makeCall: opMakeCall,
  getCall: opGetCall,
  listCalls: opListCalls,
  hangupCall: opHangupCall,
  sendVerification: opSendVerification,
  checkVerification: opCheckVerification,
  lookupNumber: opLookupNumber,
  listNumbers: opListNumbers,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendSms";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Twilio: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("Twilio: No credential configured — add your Twilio Account SID:AuthToken to the Vault.");

    let creds;
    try {
      creds = await getCreds(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, creds);
    } catch (err) {
      handleError(err);
    }
  },
};

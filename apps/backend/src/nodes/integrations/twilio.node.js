/**
 * TWILIO NODE
 *
 * Operations:
 *   sendSms      — Send an SMS message (default)
 *   makeCall     — Initiate a voice call with TwiML URL
 *   lookupNumber — Look up carrier/line-type info for a phone number
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

  const url = `${BASE}/Accounts/${accountSid}/Messages.json`;
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

  const callUrl = `${BASE}/Accounts/${accountSid}/Calls.json`;
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

const OPERATIONS = {
  sendSms: opSendSms,
  makeCall: opMakeCall,
  lookupNumber: opLookupNumber,
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

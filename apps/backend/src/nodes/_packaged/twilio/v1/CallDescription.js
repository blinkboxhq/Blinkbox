/**
 * Twilio — Voice call operations: make, get, list, hangup.
 * Handlers receive `(config, { accountSid, authToken })`.
 */
import axios from "axios";
import { BASE, encodeForm } from "../GenericFunctions.js";

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
    timeout: 120000,
  });
  return {
    callSid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    direction: response.data.direction,
  };
}

async function opGetCall(config, { accountSid, authToken }) {
  if (!config.callSid) return { success: false, error: "Twilio getCall: 'callSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls/${encodeURIComponent(config.callSid)}.json`;
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, timeout: 120000 });
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
  const response = await axios.get(url, { auth: { username: accountSid, password: authToken }, params, timeout: 120000 });
  return { calls: response.data.calls || [], count: (response.data.calls || []).length };
}

async function opHangupCall(config, { accountSid, authToken }) {
  if (!config.callSid) return { success: false, error: "Twilio hangupCall: 'callSid' is required.", skipped: true };
  const url = `${BASE}/Accounts/${encodeURIComponent(accountSid)}/Calls/${encodeURIComponent(config.callSid)}.json`;
  const response = await axios.post(url, encodeForm({ Status: "completed" }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 120000,
  });
  return { callSid: response.data.sid, status: response.data.status };
}

export const callOperations = {
  makeCall: opMakeCall,
  getCall: opGetCall,
  listCalls: opListCalls,
  hangupCall: opHangupCall,
};

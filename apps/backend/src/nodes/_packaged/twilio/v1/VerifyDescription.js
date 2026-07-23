/**
 * Twilio — Verify API operations: send OTP, check OTP.
 * Handlers receive `(config, { accountSid, authToken })`.
 */
import axios from "axios";
import { encodeForm } from "../GenericFunctions.js";

async function opSendVerification(config, { accountSid, authToken }) {
  if (!config.verifyServiceSid) return { success: false, error: "Twilio sendVerification: 'verifyServiceSid' (VAxxxx) is required.", skipped: true };
  if (!config.to) return { success: false, error: "Twilio sendVerification: 'to' is required.", skipped: true };
  const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.verifyServiceSid)}/Verifications`;
  const response = await axios.post(url, encodeForm({ To: config.to, Channel: config.channel || "sms" }), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 120000,
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
    timeout: 120000,
  });
  return { status: response.data.status, valid: response.data.valid, to: response.data.to };
}

export const verifyOperations = {
  sendVerification: opSendVerification,
  checkVerification: opCheckVerification,
};

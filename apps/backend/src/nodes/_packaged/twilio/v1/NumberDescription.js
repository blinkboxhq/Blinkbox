/**
 * Twilio — Phone number operations: carrier lookup, list owned numbers.
 * Handlers receive `(config, { accountSid, authToken })`.
 */
import axios from "axios";
import { BASE } from "../GenericFunctions.js";

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

export const numberOperations = {
  lookupNumber: opLookupNumber,
  listNumbers: opListNumbers,
};

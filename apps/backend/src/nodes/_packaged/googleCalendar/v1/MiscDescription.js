/**
 * Google Calendar — freeBusy lookup and color palette.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, authHeaders } from "../GenericFunctions.js";

async function opFreeBusy(config, token) {
  if (!config.timeMin || !config.timeMax) return { success: false, error: "Google Calendar freeBusy: 'timeMin' and 'timeMax' (ISO) are required.", skipped: true };
  const ids = config.calendarIds
    ? String(config.calendarIds).split(",").map((s) => s.trim()).filter(Boolean)
    : [config.calendarId || "primary"];
  const res = await axios.post(`${BASE}/freeBusy`, {
    timeMin: config.timeMin,
    timeMax: config.timeMax,
    timeZone: config.timeZone || undefined,
    items: ids.map((id) => ({ id })),
  }, { headers: authHeaders(token, true), timeout: 15000 });
  const calendars = res.data.calendars || {};
  return {
    busy: Object.fromEntries(Object.entries(calendars).map(([id, v]) => [id, v.busy || []])),
    calendars: Object.keys(calendars),
  };
}

async function opGetColors(config, token) {
  const res = await axios.get(`${BASE}/colors`, { headers: authHeaders(token), timeout: 15000 });
  return { event: res.data.event, calendar: res.data.calendar };
}

export const miscOperations = {
  freeBusy: opFreeBusy,
  getColors: opGetColors,
};

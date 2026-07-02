/**
 * Google Calendar — calendar operations: list/get/create/update/delete,
 * clear primary, subscribe/unsubscribe list entries.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, authHeaders, cal } from "../GenericFunctions.js";

async function opListCalendars(config, token) {
  const res = await axios.get(`${BASE}/users/me/calendarList`, {
    headers: authHeaders(token),
    timeout: 15000,
    params: { maxResults: Math.min(Number(config.limit || 100), 250), showHidden: config.showHidden || undefined },
  });
  return {
    calendars: res.data.items?.map((c) => ({ id: c.id, summary: c.summary, description: c.description, primary: c.primary ?? false, timeZone: c.timeZone, accessRole: c.accessRole, backgroundColor: c.backgroundColor })) ?? [],
    count: res.data.items?.length ?? 0,
  };
}

async function opGetCalendar(config, token) {
  const res = await axios.get(`${BASE}/calendars/${cal(config)}`, { headers: authHeaders(token), timeout: 15000 });
  return { id: res.data.id, summary: res.data.summary, description: res.data.description, timeZone: res.data.timeZone, location: res.data.location };
}

async function opCreateCalendar(config, token) {
  if (!config.summary) return { success: false, error: "Google Calendar createCalendar: 'summary' (name) is required.", skipped: true };
  const body = { summary: config.summary, description: config.description || undefined, location: config.location || undefined, timeZone: config.timeZone || undefined };
  const res = await axios.post(`${BASE}/calendars`, body, { headers: authHeaders(token, true), timeout: 15000 });
  return { id: res.data.id, summary: res.data.summary, timeZone: res.data.timeZone, created: true };
}

async function opUpdateCalendar(config, token) {
  if (!config.calendarId) return { success: false, error: "Google Calendar updateCalendar: 'calendarId' is required.", skipped: true };
  const patch = {};
  if (config.summary) patch.summary = config.summary;
  if (config.description != null) patch.description = config.description;
  if (config.location != null) patch.location = config.location;
  if (config.timeZone) patch.timeZone = config.timeZone;
  const res = await axios.patch(`${BASE}/calendars/${cal(config)}`, patch, { headers: authHeaders(token, true), timeout: 15000 });
  return { id: res.data.id, summary: res.data.summary, updated: true };
}

async function opDeleteCalendar(config, token) {
  if (!config.calendarId || config.calendarId === "primary") return { success: false, error: "Google Calendar deleteCalendar: a non-primary 'calendarId' is required.", skipped: true };
  await axios.delete(`${BASE}/calendars/${cal(config)}`, { headers: authHeaders(token), timeout: 15000 });
  return { deleted: true, calendarId: config.calendarId };
}

async function opClearCalendar(config, token) {
  const id = config.calendarId || "primary";
  if (id !== "primary") return { success: false, error: "Google Calendar clearCalendar: only the 'primary' calendar can be cleared by the API.", skipped: true };
  await axios.post(`${BASE}/calendars/primary/clear`, null, { headers: authHeaders(token), timeout: 15000 });
  return { cleared: true, calendarId: "primary" };
}

async function opAddCalendarToList(config, token) {
  if (!config.calendarId) return { success: false, error: "Google Calendar addCalendarToList: 'calendarId' is required.", skipped: true };
  const res = await axios.post(`${BASE}/users/me/calendarList`, { id: config.calendarId, colorId: config.colorId || undefined }, { headers: authHeaders(token, true), timeout: 15000 });
  return { id: res.data.id, summary: res.data.summary, subscribed: true };
}

async function opRemoveCalendarFromList(config, token) {
  if (!config.calendarId) return { success: false, error: "Google Calendar removeCalendarFromList: 'calendarId' is required.", skipped: true };
  await axios.delete(`${BASE}/users/me/calendarList/${encodeURIComponent(config.calendarId)}`, { headers: authHeaders(token), timeout: 15000 });
  return { removed: true, calendarId: config.calendarId };
}

export const calendarOperations = {
  listCalendars: opListCalendars,
  getCalendar: opGetCalendar,
  createCalendar: opCreateCalendar,
  updateCalendar: opUpdateCalendar,
  deleteCalendar: opDeleteCalendar,
  clearCalendar: opClearCalendar,
  addCalendarToList: opAddCalendarToList,
  removeCalendarFromList: opRemoveCalendarFromList,
};

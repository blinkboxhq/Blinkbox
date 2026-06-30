/**
 * GOOGLE CALENDAR NODE
 * Manage events, calendars, ACL, free/busy via Google Calendar API v3.
 *
 * Auth: Google OAuth2 access token stored in vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://www.googleapis.com/calendar/v3";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Google Calendar");
}

function authHeaders(token, json = false) {
  const h = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function cal(config) {
  return encodeURIComponent(config.calendarId || "primary");
}

function startEnd(config) {
  const start = config.allDay
    ? { date: String(config.startTime).split("T")[0] }
    : { dateTime: config.startTime, timeZone: config.timeZone || "UTC" };
  const end = config.allDay
    ? { date: String(config.endTime || config.startTime).split("T")[0] }
    : { dateTime: config.endTime || config.startTime, timeZone: config.timeZone || "UTC" };
  return { start, end };
}

function reminders(config) {
  if (config.reminderMinutes != null && config.reminderMinutes !== "") {
    const mins = Number(config.reminderMinutes);
    if (!Number.isNaN(mins)) return { useDefault: false, overrides: [{ method: config.reminderMethod || "popup", minutes: mins }] };
  }
  if (config.useDefaultReminders === false) return { useDefault: false, overrides: [] };
  return undefined;
}

function slimEvent(e) {
  return {
    id: e.id,
    summary: e.summary,
    description: e.description,
    location: e.location,
    status: e.status,
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    attendees: e.attendees?.map((a) => a.email) ?? [],
    organizer: e.organizer?.email,
    url: e.htmlLink,
    hangoutLink: e.hangoutLink,
    recurringEventId: e.recurringEventId,
  };
}

/* ---------------------------- EVENTS ---------------------------- */

async function opListEvents(config, token) {
  const res = await axios.get(`${BASE}/calendars/${cal(config)}/events`, {
    headers: authHeaders(token),
    timeout: 15000,
    params: {
      timeMin: config.timeMin || new Date().toISOString(),
      timeMax: config.timeMax || undefined,
      maxResults: Math.min(Number(config.limit || 20), 2500),
      singleEvents: config.singleEvents !== false,
      orderBy: config.singleEvents === false ? undefined : "startTime",
      q: config.query || undefined,
      showDeleted: config.showDeleted || undefined,
      pageToken: config.pageToken || undefined,
    },
  });
  return {
    events: res.data.items?.map(slimEvent) ?? [],
    count: res.data.items?.length ?? 0,
    nextPageToken: res.data.nextPageToken,
    nextSyncToken: res.data.nextSyncToken,
  };
}

async function opGetEvent(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar getEvent: 'eventId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}`, { headers: authHeaders(token), timeout: 15000 });
  return slimEvent(res.data);
}

async function opCreateEvent(config, token) {
  if (!config.summary) return { success: false, error: "Google Calendar createEvent: 'summary' (title) is required.", skipped: true };
  if (!config.startTime) return { success: false, error: "Google Calendar createEvent: 'startTime' (ISO) is required.", skipped: true };
  const { start, end } = startEnd(config);
  const body = {
    summary: config.summary,
    description: config.description || undefined,
    location: config.location || undefined,
    start,
    end,
    attendees: config.attendees ? String(config.attendees).split(",").map((e) => ({ email: e.trim() })).filter((a) => a.email) : undefined,
    recurrence: config.recurrence ? String(config.recurrence).split("\n").map((r) => r.trim()).filter(Boolean) : undefined,
    reminders: reminders(config),
    visibility: config.visibility || undefined,
    transparency: config.transparency || undefined,
    colorId: config.colorId || undefined,
    conferenceData: config.addMeetLink ? { createRequest: { requestId: `meet-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } } : undefined,
  };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/events`, body, {
    headers: authHeaders(token, true),
    timeout: 15000,
    params: {
      sendUpdates: config.sendUpdates || "none",
      conferenceDataVersion: config.addMeetLink ? 1 : undefined,
    },
  });
  return slimEvent(res.data);
}

async function opUpdateEvent(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar updateEvent: 'eventId' is required.", skipped: true };
  const patch = {};
  if (config.summary) patch.summary = config.summary;
  if (config.description != null) patch.description = config.description;
  if (config.location != null) patch.location = config.location;
  if (config.startTime) patch.start = config.allDay ? { date: String(config.startTime).split("T")[0] } : { dateTime: config.startTime, timeZone: config.timeZone || "UTC" };
  if (config.endTime) patch.end = config.allDay ? { date: String(config.endTime).split("T")[0] } : { dateTime: config.endTime, timeZone: config.timeZone || "UTC" };
  if (config.attendees) patch.attendees = String(config.attendees).split(",").map((e) => ({ email: e.trim() })).filter((a) => a.email);
  if (config.colorId) patch.colorId = config.colorId;
  if (config.visibility) patch.visibility = config.visibility;
  const rem = reminders(config);
  if (rem) patch.reminders = rem;
  const res = await axios.patch(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}`, patch, {
    headers: authHeaders(token, true),
    timeout: 15000,
    params: { sendUpdates: config.sendUpdates || "none" },
  });
  return { ...slimEvent(res.data), updated: true };
}

async function opDeleteEvent(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar deleteEvent: 'eventId' is required.", skipped: true };
  await axios.delete(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}`, {
    headers: authHeaders(token),
    timeout: 15000,
    params: { sendUpdates: config.sendUpdates || "none" },
  });
  return { deleted: true, eventId: config.eventId };
}

async function opQuickAddEvent(config, token) {
  if (!config.text) return { success: false, error: "Google Calendar quickAddEvent: 'text' is required (e.g. 'Lunch with Sam tomorrow 1pm').", skipped: true };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/events/quickAdd`, null, {
    headers: authHeaders(token),
    timeout: 15000,
    params: { text: config.text, sendUpdates: config.sendUpdates || "none" },
  });
  return slimEvent(res.data);
}

async function opMoveEvent(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar moveEvent: 'eventId' is required.", skipped: true };
  if (!config.destinationCalendarId) return { success: false, error: "Google Calendar moveEvent: 'destinationCalendarId' is required.", skipped: true };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}/move`, null, {
    headers: authHeaders(token),
    timeout: 15000,
    params: { destination: config.destinationCalendarId, sendUpdates: config.sendUpdates || "none" },
  });
  return { ...slimEvent(res.data), moved: true };
}

async function opRespondToEvent(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar respondToEvent: 'eventId' is required.", skipped: true };
  if (!config.responseStatus) return { success: false, error: "Google Calendar respondToEvent: 'responseStatus' is required (accepted/declined/tentative).", skipped: true };
  const existing = await axios.get(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}`, { headers: authHeaders(token), timeout: 15000 });
  const me = config.attendeeEmail;
  const attendees = (existing.data.attendees || []).map((a) =>
    (me ? a.email === me : a.self) ? { ...a, responseStatus: config.responseStatus } : a
  );
  if (!attendees.some((a) => (me ? a.email === me : a.self))) {
    return { success: false, error: "Google Calendar respondToEvent: You are not an attendee of this event.", skipped: true };
  }
  const res = await axios.patch(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}`, { attendees }, {
    headers: authHeaders(token, true),
    timeout: 15000,
    params: { sendUpdates: config.sendUpdates || "none" },
  });
  return { ...slimEvent(res.data), responseStatus: config.responseStatus };
}

async function opListInstances(config, token) {
  if (!config.eventId) return { success: false, error: "Google Calendar listInstances: 'eventId' (recurring event) is required.", skipped: true };
  const res = await axios.get(`${BASE}/calendars/${cal(config)}/events/${encodeURIComponent(config.eventId)}/instances`, {
    headers: authHeaders(token),
    timeout: 15000,
    params: {
      timeMin: config.timeMin || undefined,
      timeMax: config.timeMax || undefined,
      maxResults: Math.min(Number(config.limit || 25), 2500),
    },
  });
  return { instances: res.data.items?.map(slimEvent) ?? [], count: res.data.items?.length ?? 0 };
}

async function opImportEvent(config, token) {
  if (!config.iCalUID) return { success: false, error: "Google Calendar importEvent: 'iCalUID' is required.", skipped: true };
  if (!config.startTime) return { success: false, error: "Google Calendar importEvent: 'startTime' is required.", skipped: true };
  const { start, end } = startEnd(config);
  const body = { iCalUID: config.iCalUID, summary: config.summary || "(no title)", description: config.description || undefined, location: config.location || undefined, start, end };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/events/import`, body, { headers: authHeaders(token, true), timeout: 15000 });
  return slimEvent(res.data);
}

/* --------------------------- CALENDARS -------------------------- */

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

/* ------------------------------ ACL ----------------------------- */

async function opListAcl(config, token) {
  const res = await axios.get(`${BASE}/calendars/${cal(config)}/acl`, { headers: authHeaders(token), timeout: 15000 });
  return { rules: res.data.items?.map((r) => ({ id: r.id, role: r.role, scopeType: r.scope?.type, scopeValue: r.scope?.value })) ?? [], count: res.data.items?.length ?? 0 };
}

async function opShareCalendar(config, token) {
  if (!config.shareEmail && config.scopeType !== "default") return { success: false, error: "Google Calendar shareCalendar: 'shareEmail' is required.", skipped: true };
  const body = { role: config.role || "reader", scope: { type: config.scopeType || "user", value: config.shareEmail || undefined } };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/acl`, body, {
    headers: authHeaders(token, true),
    timeout: 15000,
    params: { sendNotifications: config.sendNotifications !== false },
  });
  return { id: res.data.id, role: res.data.role, scope: res.data.scope?.value, shared: true };
}

async function opUnshareCalendar(config, token) {
  if (!config.ruleId) return { success: false, error: "Google Calendar unshareCalendar: 'ruleId' is required (from listAcl).", skipped: true };
  await axios.delete(`${BASE}/calendars/${cal(config)}/acl/${encodeURIComponent(config.ruleId)}`, { headers: authHeaders(token), timeout: 15000 });
  return { unshared: true, ruleId: config.ruleId };
}

/* --------------------------- FREE/BUSY -------------------------- */

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

/* ------------------------------ COLORS -------------------------- */

async function opGetColors(config, token) {
  const res = await axios.get(`${BASE}/colors`, { headers: authHeaders(token), timeout: 15000 });
  return { event: res.data.event, calendar: res.data.calendar };
}

const OPERATIONS = {
  listEvents: opListEvents,
  getEvent: opGetEvent,
  createEvent: opCreateEvent,
  updateEvent: opUpdateEvent,
  deleteEvent: opDeleteEvent,
  quickAddEvent: opQuickAddEvent,
  moveEvent: opMoveEvent,
  respondToEvent: opRespondToEvent,
  listInstances: opListInstances,
  importEvent: opImportEvent,
  listCalendars: opListCalendars,
  getCalendar: opGetCalendar,
  createCalendar: opCreateCalendar,
  updateCalendar: opUpdateCalendar,
  deleteCalendar: opDeleteCalendar,
  clearCalendar: opClearCalendar,
  addCalendarToList: opAddCalendarToList,
  removeCalendarFromList: opRemoveCalendarFromList,
  listAcl: opListAcl,
  shareCalendar: opShareCalendar,
  unshareCalendar: opUnshareCalendar,
  freeBusy: opFreeBusy,
  getColors: opGetColors,
};

function handleError(err) {
  if (err.message?.startsWith("Google Calendar")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Google Calendar: Auth failed (${status}) — ${msg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`Google Calendar: Event or calendar not found — ${msg}`);
  if (status === 400) throw new Error(`Google Calendar: Bad request — ${msg}`);
  if (status === 409) throw new Error(`Google Calendar: Conflict — ${msg}`);
  if (status === 410) throw new Error(`Google Calendar: Gone — the sync token expired, do a full sync.`);
  if (status === 429) throw new Error("Google Calendar: Rate limit exceeded. Reduce request frequency.");
  if (status >= 500) throw new Error(`Google Calendar: Google server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`Google Calendar: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listEvents" } = config;

    if (!config.credentialId) return { success: false, error: "Google Calendar: No credential selected.", skipped: true };

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `Google Calendar: Unknown operation "${operation}".`, skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Google Calendar: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, token, context);
    } catch (err) {
      handleError(err);
    }
  },
};

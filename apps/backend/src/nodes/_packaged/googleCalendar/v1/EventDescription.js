/**
 * Google Calendar — event operations: list/get/create/update/delete, quickAdd,
 * move, RSVP, recurring instances, import. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, authHeaders, cal, startEnd, reminders, slimEvent } from "../GenericFunctions.js";

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

export const eventOperations = {
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
};

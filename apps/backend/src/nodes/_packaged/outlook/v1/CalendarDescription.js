/**
 * OUTLOOK — Calendar resource. createEvent / getCalendar preserved verbatim
 * from the monolith; getEvent, updateEvent, deleteEvent, acceptEvent and
 * declineEvent added for parity. Handlers receive (config, client).
 */
import { mapEvent } from "../GenericFunctions.js";

function buildAttendees(csv) {
  return String(csv || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address }, type: "required" }));
}

async function opCreateEvent(config, client) {
  const { subject, start, end, attendees, location, body, isHtml } = config;
  if (!subject) return { success: false, error: "Outlook createEvent: 'subject' is required.", skipped: true };
  if (!start) return { success: false, error: "Outlook createEvent: 'start' datetime is required.", skipped: true };
  if (!end) return { success: false, error: "Outlook createEvent: 'end' datetime is required.", skipped: true };

  const timeZone = config.timeZone || "UTC";
  const payload = {
    subject,
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
  };
  if (attendees) payload.attendees = buildAttendees(attendees);
  if (location) payload.location = { displayName: location };
  if (body) payload.body = { contentType: isHtml ? "HTML" : "Text", content: body };
  if (config.isOnlineMeeting) {
    payload.isOnlineMeeting = true;
    payload.onlineMeetingProvider = config.onlineMeetingProvider || "teamsForBusiness";
  }

  const res = await client.post(`/me/events`, payload);
  return { success: true, id: res.data.id, subject: res.data.subject, webLink: res.data.webLink, onlineMeeting: res.data.onlineMeeting?.joinUrl };
}

async function opGetCalendar(config, client) {
  const { startDate, endDate } = config;
  const params = { $orderby: "start/dateTime" };
  if (startDate) params.startDateTime = new Date(startDate).toISOString();
  if (endDate) params.endDateTime = new Date(endDate).toISOString();

  const path = startDate || endDate ? `/me/calendarView` : `/me/events`;
  const res = await client.get(path, params);
  return {
    success: true,
    count: res.data.value.length,
    events: res.data.value.map(mapEvent),
  };
}

async function opGetEvent(config, client) {
  const { eventId } = config;
  if (!eventId) return { success: false, error: "Outlook getEvent: 'eventId' is required.", skipped: true };
  const res = await client.get(`/me/events/${client.enc(eventId)}`);
  const e = res.data;
  return {
    success: true,
    ...mapEvent(e),
    body: e.body?.content,
    attendees: (e.attendees || []).map((a) => a.emailAddress?.address),
    isOnlineMeeting: e.isOnlineMeeting,
    joinUrl: e.onlineMeeting?.joinUrl,
  };
}

async function opUpdateEvent(config, client) {
  const { eventId } = config;
  if (!eventId) return { success: false, error: "Outlook updateEvent: 'eventId' is required.", skipped: true };
  const timeZone = config.timeZone || "UTC";
  const patch = {};
  if (config.subject !== undefined) patch.subject = config.subject;
  if (config.start) patch.start = { dateTime: config.start, timeZone };
  if (config.end) patch.end = { dateTime: config.end, timeZone };
  if (config.location !== undefined) patch.location = { displayName: config.location };
  if (config.attendees) patch.attendees = buildAttendees(config.attendees);
  if (config.body !== undefined) patch.body = { contentType: config.isHtml ? "HTML" : "Text", content: config.body };
  if (!Object.keys(patch).length) return { success: false, error: "Outlook updateEvent: no fields to update.", skipped: true };
  const res = await client.patch(`/me/events/${client.enc(eventId)}`, patch);
  return { success: true, id: res.data.id, subject: res.data.subject, webLink: res.data.webLink };
}

async function opDeleteEvent(config, client) {
  const { eventId } = config;
  if (!eventId) return { success: false, error: "Outlook deleteEvent: 'eventId' is required.", skipped: true };
  await client.del(`/me/events/${client.enc(eventId)}`);
  return { success: true, deleted: true, eventId };
}

async function opRespondEvent(action, config, client) {
  const { eventId } = config;
  if (!eventId) return { success: false, error: `Outlook ${action}Event: 'eventId' is required.`, skipped: true };
  await client.post(`/me/events/${client.enc(eventId)}/${action}`, {
    comment: config.comment || "",
    sendResponse: config.sendResponse !== false,
  });
  return { success: true, operation: `${action}Event`, eventId };
}

export const calendarOperations = {
  createEvent: opCreateEvent,
  getCalendar: opGetCalendar,
  getEvent: opGetEvent,
  updateEvent: opUpdateEvent,
  deleteEvent: opDeleteEvent,
  acceptEvent: (config, client) => opRespondEvent("accept", config, client),
  declineEvent: (config, client) => opRespondEvent("decline", config, client),
};

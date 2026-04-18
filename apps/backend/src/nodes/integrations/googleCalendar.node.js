/**
 * GOOGLE CALENDAR NODE
 * Manage events via Google Calendar API v3.
 *
 * Operations:
 *   listEvents    — List upcoming events
 *   getEvent      — Get a single event by ID
 *   createEvent   — Create a new event
 *   updateEvent   — Update an existing event
 *   deleteEvent   — Delete an event
 *   listCalendars — List all calendars for the authenticated user
 *
 * Auth: Google OAuth2 access token stored in vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://www.googleapis.com/calendar/v3";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Google Calendar");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function handleError(err) {
  if (err.message?.startsWith("Google Calendar")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Google Calendar: Auth failed — ${msg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`Google Calendar: Event or calendar not found — ${msg}`);
  throw new Error(`Google Calendar: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listEvents", calendarId = "primary" } = config;
    const token = await getToken(config.credentialId, context.workspaceId);
    const h = authHeaders(token);

    try {
      switch (operation) {
        case "listCalendars": {
          const res = await axios.get(`${BASE}/users/me/calendarList`, { headers: h, timeout: 15000 });
          return { calendars: res.data.items?.map((c) => ({ id: c.id, summary: c.summary, primary: c.primary ?? false, timeZone: c.timeZone })) ?? [], count: res.data.items?.length ?? 0 };
        }

        case "listEvents": {
          const res = await axios.get(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
            headers: h, timeout: 15000,
            params: {
              timeMin: config.timeMin ?? new Date().toISOString(),
              timeMax: config.timeMax,
              maxResults: Math.min(Number(config.limit ?? 20), 250),
              singleEvents: true,
              orderBy: "startTime",
              q: config.query,
            },
          });
          return {
            events: res.data.items?.map((e) => ({ id: e.id, summary: e.summary, start: e.start?.dateTime ?? e.start?.date, end: e.end?.dateTime ?? e.end?.date, location: e.location, description: e.description })) ?? [],
            count: res.data.items?.length ?? 0,
          };
        }

        case "getEvent": {
          if (!config.eventId) throw new Error("Google Calendar getEvent: 'eventId' is required.");
          const res = await axios.get(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${config.eventId}`, { headers: h, timeout: 15000 });
          return { id: res.data.id, summary: res.data.summary, description: res.data.description, start: res.data.start?.dateTime ?? res.data.start?.date, end: res.data.end?.dateTime ?? res.data.end?.date, location: res.data.location, attendees: res.data.attendees?.map((a) => a.email) ?? [] };
        }

        case "createEvent": {
          if (!config.summary) throw new Error("Google Calendar createEvent: 'summary' (title) is required.");
          if (!config.startTime) throw new Error("Google Calendar createEvent: 'startTime' (ISO) is required.");
          const body = {
            summary: config.summary,
            description: config.description,
            location: config.location,
            start: config.allDay ? { date: config.startTime.split("T")[0] } : { dateTime: config.startTime, timeZone: config.timeZone ?? "UTC" },
            end: config.allDay ? { date: (config.endTime ?? config.startTime).split("T")[0] } : { dateTime: config.endTime ?? config.startTime, timeZone: config.timeZone ?? "UTC" },
            attendees: config.attendees ? String(config.attendees).split(",").map((e) => ({ email: e.trim() })) : undefined,
          };
          const res = await axios.post(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events`, body, { headers: { ...h, "Content-Type": "application/json" }, timeout: 15000 });
          return { id: res.data.id, summary: res.data.summary, url: res.data.htmlLink, start: res.data.start?.dateTime ?? res.data.start?.date };
        }

        case "updateEvent": {
          if (!config.eventId) throw new Error("Google Calendar updateEvent: 'eventId' is required.");
          const existing = await axios.get(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${config.eventId}`, { headers: h, timeout: 15000 });
          const patch = { ...existing.data };
          if (config.summary) patch.summary = config.summary;
          if (config.description) patch.description = config.description;
          if (config.location) patch.location = config.location;
          if (config.startTime) patch.start = { dateTime: config.startTime, timeZone: config.timeZone ?? "UTC" };
          if (config.endTime) patch.end = { dateTime: config.endTime, timeZone: config.timeZone ?? "UTC" };
          const res = await axios.put(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${config.eventId}`, patch, { headers: { ...h, "Content-Type": "application/json" }, timeout: 15000 });
          return { id: res.data.id, summary: res.data.summary, updated: true };
        }

        case "deleteEvent": {
          if (!config.eventId) throw new Error("Google Calendar deleteEvent: 'eventId' is required.");
          await axios.delete(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${config.eventId}`, { headers: h, timeout: 15000 });
          return { deleted: true, eventId: config.eventId };
        }

        default:
          throw new Error(`Google Calendar: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

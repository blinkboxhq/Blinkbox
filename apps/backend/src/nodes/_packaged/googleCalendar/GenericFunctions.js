/**
 * Google Calendar — shared helpers for all v1 resource files.
 * Handlers receive `(config, token)` where token is the raw Google OAuth2
 * access token; makeReq(token) is the identity passthrough the slim entry
 * uses to preserve that calling convention.
 */
export const BASE = "https://www.googleapis.com/calendar/v3";

export function authHeaders(token, json = false) {
  const h = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export function cal(config) {
  return encodeURIComponent(config.calendarId || "primary");
}

export function startEnd(config) {
  const start = config.allDay
    ? { date: String(config.startTime).split("T")[0] }
    : { dateTime: config.startTime, timeZone: config.timeZone || "UTC" };
  const end = config.allDay
    ? { date: String(config.endTime || config.startTime).split("T")[0] }
    : { dateTime: config.endTime || config.startTime, timeZone: config.timeZone || "UTC" };
  return { start, end };
}

export function reminders(config) {
  if (config.reminderMinutes != null && config.reminderMinutes !== "") {
    const mins = Number(config.reminderMinutes);
    if (!Number.isNaN(mins)) return { useDefault: false, overrides: [{ method: config.reminderMethod || "popup", minutes: mins }] };
  }
  if (config.useDefaultReminders === false) return { useDefault: false, overrides: [] };
  return undefined;
}

export function slimEvent(e) {
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

export function handleError(err) {
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

// Google Calendar passes the resolved OAuth2 token straight through to handlers.
export function makeReq(token) {
  return token;
}

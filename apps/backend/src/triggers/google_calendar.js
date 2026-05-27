import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.events) return input;
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Google Calendar");
    const calendarId = config.calendarId || "primary";
    const now = new Date();
    const timeMin = config.timeMin || now.toISOString();
    const timeMax = config.timeMax || new Date(now.getTime() + (config.lookAheadDays || 7) * 86400000).toISOString();
    const params = { maxResults: Math.min(config.maxResults || 10, 250), singleEvents: true, orderBy: "startTime", timeMin, timeMax };
    if (config.query) params.q = config.query;
    const { data } = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { params, headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );
    const events = (data?.items ?? []).map(e => ({
      id: e.id, summary: e.summary, description: e.description, location: e.location,
      status: e.status, url: e.htmlLink, calendarId,
      startTime: e.start?.dateTime || e.start?.date,
      endTime: e.end?.dateTime || e.end?.date,
      isAllDay: !e.start?.dateTime,
      organizer: e.organizer?.email,
      attendees: (e.attendees ?? []).map(a => ({ email: a.email, name: a.displayName, status: a.responseStatus, self: a.self })),
      attendeeCount: e.attendees?.length ?? 0,
      recurrence: e.recurrence ?? [],
      conferenceLink: e.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video")?.uri,
      created: e.created, updated: e.updated, etag: e.etag,
    }));
    return { calendarId, events, count: events.length, nextEvent: events[0] ?? null, timeMin, timeMax, triggeredAt: new Date().toISOString() };
  },
};

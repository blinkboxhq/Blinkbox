/**
 * Google Calendar — operation router. Merges every v1 resource map into one
 * dispatch table; handlers are called `(config, token, context)` exactly as
 * the monolith did (context is unused today but preserved).
 */
import { handleError } from "./GenericFunctions.js";
import { eventOperations } from "./v1/EventDescription.js";
import { calendarOperations } from "./v1/CalendarDescription.js";
import { aclOperations } from "./v1/AclDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...eventOperations,
  ...calendarOperations,
  ...aclOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "listEvents";

export const OPERATION_SCHEMA = {
  listEvents: { description: "List events in a date range", recommended: true },
  getEvent: { description: "Read one event by ID" },
  createEvent: { description: "Create an event with attendees and reminders", recommended: true },
  updateEvent: { description: "Update an event's time, title or attendees", recommended: true },
  deleteEvent: { description: "Delete an event", recommended: true },
  quickAddEvent: { description: "Create an event from natural language text" },
  moveEvent: { description: "Move an event to another calendar" },
  respondToEvent: { description: "RSVP to an event invitation" },
  listInstances: { description: "List the instances of a recurring event" },
  importEvent: { description: "Import an external event into a calendar" },
  listCalendars: { description: "List the user's calendars" },
  getCalendar: { description: "Read one calendar's details" },
  createCalendar: { description: "Create a secondary calendar" },
  updateCalendar: { description: "Rename or update a calendar" },
  deleteCalendar: { description: "Delete a secondary calendar" },
  clearCalendar: { description: "Remove all events from the primary calendar" },
  addCalendarToList: { description: "Subscribe to a calendar by ID" },
  removeCalendarFromList: { description: "Unsubscribe from a calendar" },
  listAcl: { description: "List a calendar's sharing rules" },
  shareCalendar: { description: "Share a calendar with a user" },
  unshareCalendar: { description: "Revoke a user's calendar access" },
  freeBusy: { description: "Check free/busy across calendars for a time range", recommended: true },
  getColors: { description: "List available calendar and event colors" },
};

export async function run(config, req, context = {}) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Google Calendar: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req, context);
  } catch (err) {
    handleError(err);
  }
}

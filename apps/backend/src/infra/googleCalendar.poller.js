/**
 * Google Calendar Poller
 * Fires when a calendar event is starting within the next N minutes.
 * Uses OAuth credential (same pattern as gmail.poller.js).
 * Dedup key: bb:gcal:seen:{automationId} (24h TTL)
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-gcal-poller";
const SEEN_TTL = 24 * 60 * 60;

let gcalQueue = null;
let gcalWorker = null;

// Each event = a distinct Calendar query MODE + a client-side predicate.
//  - "upcoming": list events starting inside the next-N-minute window
//    (timeMin=now, orderBy=startTime). Fires once as an event begins.
//  - "changes": list events touched since last poll (updatedMin, orderBy=updated,
//    showDeleted). Catches create / edit / cancel regardless of start time.
const CAL_EVENTS = {
  event_starting:    { mode: "upcoming", match: () => true },
  all_day_starting:  { mode: "upcoming", match: (e) => e.allDay },
  recurring_starting:{ mode: "upcoming", match: (e) => !!e.recurringEventId },
  with_meet_link:    { mode: "upcoming", match: (e) => !!e.meetLink },
  with_attendees:    { mode: "upcoming", match: (e) => e.attendees.length > 0 },
  location_set:      { mode: "upcoming", match: (e) => !!e.location },
  ends_soon:         { mode: "ending",   match: () => true },
  event_created:     { mode: "changes",  match: (e) => e.status !== "cancelled" && e.created && e.updated && Math.abs(new Date(e.updated) - new Date(e.created)) < 5000 },
  event_updated:     { mode: "changes",  match: (e) => e.status !== "cancelled" },
  event_cancelled:   { mode: "changes",  match: (e) => e.status === "cancelled" },
  invite_accepted:   { mode: "changes",  match: (e) => e.selfResponse === "accepted" },
  invite_declined:   { mode: "changes",  match: (e) => e.selfResponse === "declined" },
};

function shapeEvent(e) {
  return {
    eventId: e.id,
    title: e.summary || "",
    description: e.description || "",
    startTime: e.start?.dateTime || e.start?.date || "",
    endTime: e.end?.dateTime || e.end?.date || "",
    allDay: !!e.start?.date && !e.start?.dateTime,
    location: e.location || "",
    attendees: (e.attendees || []).map((a) => a.email),
    organizer: e.organizer?.email || "",
    meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || "",
    status: e.status || "",
    created: e.created || "",
    updated: e.updated || "",
    recurringEventId: e.recurringEventId || "",
    selfResponse: (e.attendees || []).find((a) => a.self)?.responseStatus || "",
    htmlLink: e.htmlLink || "",
  };
}

async function fetchEvents(token, calendarId, mode, minutesBefore, filterQuery, lastSyncKey) {
  const now = new Date();
  const params = new URLSearchParams({ singleEvents: "true", maxResults: "20" });

  if (mode === "changes") {
    const lastSync = await redis.get(lastSyncKey);
    const since = lastSync ? new Date(lastSync) : new Date(now.getTime() - 10 * 60 * 1000);
    params.set("updatedMin", since.toISOString());
    params.set("orderBy", "updated");
    params.set("showDeleted", "true");
    await redis.setex(lastSyncKey, 30 * 24 * 60 * 60, now.toISOString());
  } else {
    const span = (minutesBefore || 1) * 60 * 1000 + 60000;
    const windowEnd = new Date(now.getTime() + span);
    if (mode === "ending") {
      params.set("timeMin", new Date(now.getTime() - span).toISOString());
      params.set("timeMax", now.toISOString());
    } else {
      params.set("timeMin", now.toISOString());
      params.set("timeMax", windowEnd.toISOString());
    }
    params.set("orderBy", "startTime");
  }
  if (filterQuery) params.set("q", filterQuery);

  const encodedId = encodeURIComponent(calendarId || "primary");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Calendar API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return (data.items || []).map(shapeEvent);
}

export async function pollCalendar(automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery, eventType) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:gcal:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const type = eventType || "event_starting";
    const spec = CAL_EVENTS[type] || CAL_EVENTS.event_starting;
    const token = await getOAuthToken(credentialId, workspaceId, "Google Calendar Trigger");
    const lastSyncKey = `bb:gcal:sync:${scope}:${type}`;
    const events = await fetchEvents(token, calendarId, spec.mode, minutesBefore, filterQuery, lastSyncKey);
    if (!events.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    // "changes" mode re-fires when an event is edited, so dedup on id:updated.
    const changeAware = spec.mode === "changes";
    const seenKey = `bb:gcal:seen:${scope}:${type}`;
    for (const event of events) {
      if (!spec.match(event)) continue;
      const dedup = changeAware ? `${event.eventId}:${event.updated}` : event.eventId;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, event, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `gcal:${scope}:${type}:${dedup}` });
      } catch (err) {
        console.error(`[GCalPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[GCalPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startGoogleCalendarPoller() {
  console.log("[GCalPoller] Starting...");
  gcalQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  gcalWorker = new Worker(QUEUE_NAME, async (job) => {
    const { automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery, eventType } = job.data;
    await pollCalendar(automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery, eventType);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  gcalWorker.on("failed", (job, err) => console.error(`[GCalPoller] Job failed:`, err.message));
  await syncGoogleCalendarJobs();
  console.log("[GCalPoller] Ready");
}

export async function syncGoogleCalendarJobs() {
  if (!gcalQueue) return;
  const existing = await gcalQueue.getRepeatableJobs();
  for (const job of existing) await gcalQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "google_calendar_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.credentialId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 1;
    await gcalQueue.add("gcal-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      calendarId: cfg.calendarId || "primary",
      minutesBefore: parseInt(cfg.minutesBefore) || 0,
      filterQuery: cfg.filterQuery || "",
      eventType: cfg.eventType || cfg.watchType,
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `gcal-${automation._id}` });
  }
  console.log(`[GCalPoller] Synced ${automations.length} automations`);
}

export async function stopGoogleCalendarPoller() {
  if (gcalWorker) await gcalWorker.close();
  if (gcalQueue) await gcalQueue.close();
  gcalWorker = null; gcalQueue = null;
}

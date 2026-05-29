/**
 * Google Calendar Poller
 * Fires when a calendar event is starting within the next N minutes.
 * Uses OAuth credential (same pattern as gmail.poller.js).
 * Dedup key: bb:gcal:seen:{automationId} (24h TTL)
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-gcal-poller";
const SEEN_TTL = 24 * 60 * 60;

let gcalQueue = null;
let gcalWorker = null;

async function fetchUpcomingEvents(token, calendarId, minutesBefore, filterQuery) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + (minutesBefore || 1) * 60 * 1000 + 60000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: windowEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "10",
  });
  if (filterQuery) params.set("q", filterQuery);

  const encodedId = encodeURIComponent(calendarId || "primary");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Calendar API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return (data.items || []).map((e) => ({
    eventId: e.id,
    title: e.summary || "",
    description: e.description || "",
    startTime: e.start?.dateTime || e.start?.date || "",
    endTime: e.end?.dateTime || e.end?.date || "",
    location: e.location || "",
    attendees: (e.attendees || []).map((a) => a.email),
    organizer: e.organizer?.email || "",
    meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || "",
    status: e.status || "",
    htmlLink: e.htmlLink || "",
  }));
}

export async function pollCalendar(automationId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery) {
  const lockKey = `bb:gcal:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const token = await getOAuthToken(credentialId, workspaceId, "Google Calendar Trigger");
    const events = await fetchUpcomingEvents(token, calendarId, minutesBefore, filterQuery);
    if (!events.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:gcal:seen:${automationId}`;
    for (const event of events) {
      const added = await redis.sadd(seenKey, event.eventId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, event, { workspaceId: automation.workspaceId, idempotencyKey: `gcal:${automation._id}:${event.eventId}` });
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
    const { automationId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery } = job.data;
    await pollCalendar(automationId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery);
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
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      calendarId: cfg.calendarId || "primary",
      minutesBefore: parseInt(cfg.minutesBefore) || 0,
      filterQuery: cfg.filterQuery || "",
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `gcal-${automation._id}` });
  }
  console.log(`[GCalPoller] Synced ${automations.length} automations`);
}

export async function stopGoogleCalendarPoller() {
  if (gcalWorker) await gcalWorker.close();
  if (gcalQueue) await gcalQueue.close();
  gcalWorker = null; gcalQueue = null;
}

/**
 * Datadog — Events.
 */
import { need, num, csv, nowSec } from "../GenericFunctions.js";

async function opCreateEvent(config, { v1 }) {
  const e = need(config, "title", "createEvent"); if (e) return e;
  const body = {
    title: config.title,
    text: config.text || "",
    tags: config.tags ? csv(config.tags) : [],
    alert_type: config.alertType || "info",
  };
  if (config.priority) body.priority = config.priority;
  if (config.host) body.host = config.host;
  if (config.aggregationKey) body.aggregation_key = config.aggregationKey;
  const { data } = await v1.post("/events", body);
  return { success: true, id: data.event?.id, url: data.event?.url, status: "created" };
}

async function opGetEvent(config, { v1 }) {
  const e = need(config, "eventId", "getEvent"); if (e) return e;
  const { data } = await v1.get(`/events/${encodeURIComponent(config.eventId)}`);
  return { success: true, ...data.event };
}

async function opListEvents(config, { v1 }) {
  const now = nowSec();
  const { data } = await v1.get("/events", {
    params: {
      start: num(config.from, now - 3600),
      end: num(config.to, now),
      priority: config.priority,
      tags: config.tags,
      sources: config.source,
    },
  });
  return { success: true, events: data.events, count: data.events?.length || 0 };
}

export const eventOperations = {
  createEvent: opCreateEvent,
  sendEvent: opCreateEvent,
  getEvent: opGetEvent,
  listEvents: opListEvents,
};

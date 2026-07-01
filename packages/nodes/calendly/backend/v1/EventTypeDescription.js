/**
 * Calendly — Event Types, Available Times & Scheduling Links.
 */
import { need, me, pageParams, uuidOf } from "../GenericFunctions.js";

async function opListEventTypes(config, { api }) {
  const params = pageParams(config);
  if (config.organizationUri) params.organization = config.organizationUri;
  else params.user = config.userUri || (await me(api)).uri;
  if (config.active !== undefined && config.active !== "") params.active = config.active;
  const { data } = await api.get("/event_types", { params });
  return { success: true, eventTypes: data.collection, pagination: data.pagination };
}

async function opGetEventType(config, { api }) {
  const g = need(config, "eventTypeUri", "getEventType"); if (g) return g;
  const { data } = await api.get(`/event_types/${uuidOf(config.eventTypeUri)}`);
  return { success: true, ...data.resource };
}

async function opGetEventTypeAvailableTimes(config, { api }) {
  const g = need(config, "eventTypeUri", "getEventTypeAvailableTimes"); if (g) return g;
  const s = need(config, "startTime", "getEventTypeAvailableTimes"); if (s) return s;
  const e = need(config, "endTime", "getEventTypeAvailableTimes"); if (e) return e;
  const { data } = await api.get("/event_type_available_times", {
    params: { event_type: config.eventTypeUri, start_time: config.startTime, end_time: config.endTime },
  });
  return { success: true, availableTimes: data.collection };
}

async function opCreateSchedulingLink(config, { api }) {
  const g = need(config, "eventTypeUri", "createSchedulingLink"); if (g) return g;
  const { data } = await api.post("/scheduling_links", {
    max_event_count: Number(config.maxEventCount) || 1,
    owner: config.eventTypeUri,
    owner_type: "EventType",
  });
  return { success: true, ...data.resource };
}

export const eventTypeOperations = {
  listEventTypes: opListEventTypes,
  getEventType: opGetEventType,
  getEventTypeAvailableTimes: opGetEventTypeAvailableTimes,
  createSchedulingLink: opCreateSchedulingLink,
};

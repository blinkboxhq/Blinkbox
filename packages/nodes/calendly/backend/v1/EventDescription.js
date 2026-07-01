/**
 * Calendly — Scheduled Events, Invitees & No-Shows.
 */
import { need, me, pageParams, uuidOf } from "../GenericFunctions.js";

async function opListEvents(config, { api }) {
  const params = pageParams(config);
  if (config.organizationUri) params.organization = config.organizationUri;
  else params.user = config.userUri || (await me(api)).uri;
  if (config.status) params.status = config.status;
  if (config.minStartTime) params.min_start_time = config.minStartTime;
  if (config.maxStartTime) params.max_start_time = config.maxStartTime;
  if (config.inviteeEmail) params.invitee_email = config.inviteeEmail;
  if (config.sort) params.sort = config.sort;
  const { data } = await api.get("/scheduled_events", { params });
  return { success: true, events: data.collection, pagination: data.pagination };
}

async function opGetEvent(config, { api }) {
  const g = need(config, "eventUri", "getEvent"); if (g) return g;
  const { data } = await api.get(`/scheduled_events/${uuidOf(config.eventUri)}`);
  return { success: true, ...data.resource };
}

async function opCancelEvent(config, { api }) {
  const g = need(config, "eventUri", "cancelEvent"); if (g) return g;
  const body = {};
  if (config.reason) body.reason = config.reason;
  const { data } = await api.post(`/scheduled_events/${uuidOf(config.eventUri)}/cancellation`, body);
  return { success: true, canceled: true, ...(data?.resource || {}) };
}

async function opListInvitees(config, { api }) {
  const g = need(config, "eventUri", "listInvitees"); if (g) return g;
  const params = pageParams(config);
  if (config.status) params.status = config.status;
  if (config.email) params.email = config.email;
  const { data } = await api.get(`/scheduled_events/${uuidOf(config.eventUri)}/invitees`, { params });
  return { success: true, invitees: data.collection, pagination: data.pagination };
}

async function opGetInvitee(config, { api }) {
  const e = need(config, "eventUri", "getInvitee"); if (e) return e;
  const i = need(config, "inviteeUuid", "getInvitee"); if (i) return i;
  const { data } = await api.get(
    `/scheduled_events/${uuidOf(config.eventUri)}/invitees/${uuidOf(config.inviteeUuid)}`
  );
  return { success: true, ...data.resource };
}

async function opCreateInviteeNoShow(config, { api }) {
  const g = need(config, "inviteeUri", "createInviteeNoShow"); if (g) return g;
  const { data } = await api.post("/invitee_no_shows", { invitee: config.inviteeUri });
  return { success: true, ...data.resource };
}

async function opDeleteInviteeNoShow(config, { api }) {
  const g = need(config, "noShowUri", "deleteInviteeNoShow"); if (g) return g;
  await api.delete(`/invitee_no_shows/${uuidOf(config.noShowUri)}`);
  return { success: true, deleted: config.noShowUri };
}

export const eventOperations = {
  listEvents: opListEvents,
  getEvent: opGetEvent,
  cancelEvent: opCancelEvent,
  listInvitees: opListInvitees,
  getInvitee: opGetInvitee,
  createInviteeNoShow: opCreateInviteeNoShow,
  deleteInviteeNoShow: opDeleteInviteeNoShow,
};

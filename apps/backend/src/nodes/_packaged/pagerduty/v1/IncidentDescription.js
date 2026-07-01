/**
 * PagerDuty — Incidents.
 */
import { need, num, csv, ref, skip, fromHeaders } from "../GenericFunctions.js";

async function opListIncidents(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.statuses) params["statuses[]"] = csv(config.statuses);
  if (config.serviceId) params["service_ids[]"] = csv(config.serviceId);
  if (config.urgency) params["urgencies[]"] = config.urgency;
  if (config.since) params.since = config.since;
  if (config.until) params.until = config.until;
  const { data } = await api.get("/incidents", { params });
  return { success: true, total: data.total, incidents: data.incidents };
}

async function opGetIncident(config, { api }) {
  const e = need(config, "incidentId", "getIncident"); if (e) return e;
  const { data } = await api.get(`/incidents/${config.incidentId}`);
  return { success: true, ...data.incident };
}

async function opCreateIncident(config, { api }) {
  let e = need(config, "title", "createIncident"); if (e) return e;
  e = need(config, "serviceId", "createIncident"); if (e) return e;
  const incident = {
    type: "incident",
    title: config.title,
    urgency: config.urgency || "high",
    service: ref(config.serviceId, "service_reference"),
  };
  if (config.body) incident.body = { type: "incident_body", details: config.body };
  if (config.incidentKey) incident.incident_key = config.incidentKey;
  if (config.escalationPolicyId) incident.escalation_policy = ref(config.escalationPolicyId, "escalation_policy_reference");
  if (config.priorityId) incident.priority = ref(config.priorityId, "priority_reference");
  if (config.assigneeId) incident.assignments = [{ assignee: ref(config.assigneeId, "user_reference") }];
  const { data } = await api.post("/incidents", { incident }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opUpdateIncident(config, { api }) {
  const e = need(config, "incidentId", "updateIncident"); if (e) return e;
  const incident = { type: "incident" };
  if (config.title) incident.title = config.title;
  if (config.status) incident.status = config.status;
  if (config.urgency) incident.urgency = config.urgency;
  if (config.priorityId) incident.priority = ref(config.priorityId, "priority_reference");
  if (config.escalationLevel) incident.escalation_level = num(config.escalationLevel, 1);
  if (Object.keys(incident).length === 1) return skip("updateIncident", "provide at least one field to update.");
  const { data } = await api.put(`/incidents/${config.incidentId}`, { incident }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opResolveIncident(config, { api }) {
  const e = need(config, "incidentId", "resolveIncident"); if (e) return e;
  const { data } = await api.put(`/incidents/${config.incidentId}`, { incident: { type: "incident", status: "resolved" } }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opAcknowledgeIncident(config, { api }) {
  const e = need(config, "incidentId", "acknowledgeIncident"); if (e) return e;
  const { data } = await api.put(`/incidents/${config.incidentId}`, { incident: { type: "incident", status: "acknowledged" } }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opSnoozeIncident(config, { api }) {
  const e = need(config, "incidentId", "snoozeIncident"); if (e) return e;
  const { data } = await api.post(`/incidents/${config.incidentId}/snooze`, { duration: num(config.duration, 3600) }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opMergeIncidents(config, { api }) {
  const e = need(config, "incidentId", "mergeIncidents"); if (e) return e;
  if (!config.sourceIncidentIds) return skip("mergeIncidents", "'sourceIncidentIds' (comma-separated) is required.");
  const source_incidents = csv(config.sourceIncidentIds).map((id) => ref(id, "incident_reference"));
  const { data } = await api.put(`/incidents/${config.incidentId}/merge`, { source_incidents }, { headers: fromHeaders(config) });
  return { success: true, ...data.incident };
}

async function opAddNote(config, { api }) {
  let e = need(config, "incidentId", "addNote"); if (e) return e;
  e = need(config, "content", "addNote"); if (e) return e;
  const { data } = await api.post(`/incidents/${config.incidentId}/notes`, { note: { content: config.content } }, { headers: fromHeaders(config) });
  return { success: true, ...data.note };
}

async function opListNotes(config, { api }) {
  const e = need(config, "incidentId", "listNotes"); if (e) return e;
  const { data } = await api.get(`/incidents/${config.incidentId}/notes`);
  return { success: true, count: data.notes.length, notes: data.notes };
}

async function opAddResponder(config, { api }) {
  let e = need(config, "incidentId", "addResponder"); if (e) return e;
  e = need(config, "assigneeId", "addResponder"); if (e) return e;
  const body = {
    requester_id: config.requesterId || config.assigneeId,
    message: config.message || "Please help with this incident.",
    responder_request_targets: [{ responder_request_target: ref(config.assigneeId, "user_reference") }],
  };
  const { data } = await api.post(`/incidents/${config.incidentId}/responder_requests`, body, { headers: fromHeaders(config) });
  return { success: true, ...data.responder_request };
}

async function opListAlerts(config, { api }) {
  const e = need(config, "incidentId", "listAlerts"); if (e) return e;
  const { data } = await api.get(`/incidents/${config.incidentId}/alerts`, { params: { limit: num(config.limit, 25) } });
  return { success: true, count: data.alerts.length, alerts: data.alerts };
}

async function opListLogEntries(config, { api }) {
  const e = need(config, "incidentId", "listLogEntries"); if (e) return e;
  const { data } = await api.get(`/incidents/${config.incidentId}/log_entries`, { params: { limit: num(config.limit, 25) } });
  return { success: true, count: data.log_entries.length, logEntries: data.log_entries };
}

export const incidentOperations = {
  listIncidents: opListIncidents,
  getIncident: opGetIncident,
  createIncident: opCreateIncident,
  updateIncident: opUpdateIncident,
  resolveIncident: opResolveIncident,
  acknowledgeIncident: opAcknowledgeIncident,
  snoozeIncident: opSnoozeIncident,
  mergeIncidents: opMergeIncidents,
  addNote: opAddNote,
  listNotes: opListNotes,
  addResponder: opAddResponder,
  listAlerts: opListAlerts,
  listLogEntries: opListLogEntries,
};

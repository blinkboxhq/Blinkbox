/**
 * PAGERDUTY NODE — nuclear dispatch
 * PagerDuty REST API v2 + Events API v2: incidents, services, schedules,
 * escalation policies, on-calls, users, teams, priorities, event triggers.
 * Auth: PagerDuty API key (Token) from credential vault.
 * Mutating incident ops require a `From` email header (config.fromEmail).
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.pagerduty.com";
const EVENTS_URL = "https://events.pagerduty.com/v2/enqueue";

const skip = (op, msg) => ({ success: false, error: `PagerDuty ${op}: ${msg}`, skipped: true });
const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));

const ref = (id, type) => ({ id, type });

function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}
function fromHeaders(config) {
  return config.fromEmail ? { From: config.fromEmail } : {};
}

/* ---------------- Incidents ---------------- */

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

/* ---------------- Services ---------------- */

async function opListServices(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/services", { params });
  return { success: true, total: data.total, services: data.services };
}

async function opGetService(config, { api }) {
  const e = need(config, "serviceId", "getService"); if (e) return e;
  const { data } = await api.get(`/services/${config.serviceId}`);
  return { success: true, ...data.service };
}

async function opCreateService(config, { api }) {
  let e = need(config, "name", "createService"); if (e) return e;
  e = need(config, "escalationPolicyId", "createService"); if (e) return e;
  const service = {
    type: "service",
    name: config.name,
    escalation_policy: ref(config.escalationPolicyId, "escalation_policy_reference"),
  };
  if (config.description) service.description = config.description;
  if (config.urgency) service.acknowledgement_timeout = null;
  const { data } = await api.post("/services", { service });
  return { success: true, ...data.service };
}

async function opUpdateService(config, { api }) {
  const e = need(config, "serviceId", "updateService"); if (e) return e;
  const service = { type: "service" };
  if (config.name) service.name = config.name;
  if (config.description) service.description = config.description;
  if (config.status) service.status = config.status;
  if (config.escalationPolicyId) service.escalation_policy = ref(config.escalationPolicyId, "escalation_policy_reference");
  const { data } = await api.put(`/services/${config.serviceId}`, { service });
  return { success: true, ...data.service };
}

async function opDeleteService(config, { api }) {
  const e = need(config, "serviceId", "deleteService"); if (e) return e;
  await api.delete(`/services/${config.serviceId}`);
  return { success: true, deleted: config.serviceId };
}

/* ---------------- Escalation Policies ---------------- */

async function opListEscalationPolicies(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/escalation_policies", { params });
  return { success: true, total: data.total, escalationPolicies: data.escalation_policies };
}

async function opGetEscalationPolicy(config, { api }) {
  const e = need(config, "escalationPolicyId", "getEscalationPolicy"); if (e) return e;
  const { data } = await api.get(`/escalation_policies/${config.escalationPolicyId}`);
  return { success: true, ...data.escalation_policy };
}

async function opDeleteEscalationPolicy(config, { api }) {
  const e = need(config, "escalationPolicyId", "deleteEscalationPolicy"); if (e) return e;
  await api.delete(`/escalation_policies/${config.escalationPolicyId}`);
  return { success: true, deleted: config.escalationPolicyId };
}

/* ---------------- Schedules ---------------- */

async function opListSchedules(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/schedules", { params });
  return { success: true, total: data.total, schedules: data.schedules };
}

async function opGetSchedule(config, { api }) {
  const e = need(config, "scheduleId", "getSchedule"); if (e) return e;
  const params = {};
  if (config.since) params.since = config.since;
  if (config.until) params.until = config.until;
  const { data } = await api.get(`/schedules/${config.scheduleId}`, { params });
  return { success: true, ...data.schedule };
}

async function opListOverrides(config, { api }) {
  const e = need(config, "scheduleId", "listOverrides"); if (e) return e;
  const params = { since: config.since, until: config.until };
  const { data } = await api.get(`/schedules/${config.scheduleId}/overrides`, { params });
  return { success: true, count: data.overrides.length, overrides: data.overrides };
}

async function opCreateOverride(config, { api }) {
  let e = need(config, "scheduleId", "createOverride"); if (e) return e;
  e = need(config, "assigneeId", "createOverride"); if (e) return e;
  if (!config.since || !config.until) return skip("createOverride", "'since' and 'until' (ISO timestamps) are required.");
  const body = { overrides: [{ start: config.since, end: config.until, user: ref(config.assigneeId, "user_reference") }] };
  const { data } = await api.post(`/schedules/${config.scheduleId}/overrides`, body);
  return { success: true, overrides: data.overrides };
}

/* ---------------- On-calls ---------------- */

async function opListOnCalls(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.escalationPolicyId) params["escalation_policy_ids[]"] = csv(config.escalationPolicyId);
  if (config.scheduleId) params["schedule_ids[]"] = csv(config.scheduleId);
  if (config.userId) params["user_ids[]"] = csv(config.userId);
  if (config.since) params.since = config.since;
  if (config.until) params.until = config.until;
  const { data } = await api.get("/oncalls", { params });
  return { success: true, count: data.oncalls.length, oncalls: data.oncalls };
}

/* ---------------- Users & Teams ---------------- */

async function opListUsers(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/users", { params });
  return { success: true, total: data.total, users: data.users };
}

async function opGetUser(config, { api }) {
  const e = need(config, "userId", "getUser"); if (e) return e;
  const { data } = await api.get(`/users/${config.userId}`);
  return { success: true, ...data.user };
}

async function opGetCurrentUser(config, { api }) {
  const { data } = await api.get("/users/me");
  return { success: true, ...data.user };
}

async function opListContactMethods(config, { api }) {
  const e = need(config, "userId", "listContactMethods"); if (e) return e;
  const { data } = await api.get(`/users/${config.userId}/contact_methods`);
  return { success: true, count: data.contact_methods.length, contactMethods: data.contact_methods };
}

async function opListTeams(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/teams", { params });
  return { success: true, total: data.total, teams: data.teams };
}

async function opGetTeam(config, { api }) {
  const e = need(config, "teamId", "getTeam"); if (e) return e;
  const { data } = await api.get(`/teams/${config.teamId}`);
  return { success: true, ...data.team };
}

async function opListTeamMembers(config, { api }) {
  const e = need(config, "teamId", "listTeamMembers"); if (e) return e;
  const { data } = await api.get(`/teams/${config.teamId}/members`, { params: { limit: num(config.limit, 25) } });
  return { success: true, count: data.members.length, members: data.members };
}

/* ---------------- Priorities ---------------- */

async function opListPriorities(config, { api }) {
  const { data } = await api.get("/priorities");
  return { success: true, count: data.priorities.length, priorities: data.priorities };
}

/* ---------------- Events API v2 ---------------- */

async function opTriggerEvent(config) {
  let e = need(config, "routingKey", "triggerEvent"); if (e) return e;
  e = need(config, "summary", "triggerEvent"); if (e) return e;
  const payload = {
    routing_key: config.routingKey,
    event_action: "trigger",
    payload: {
      summary: config.summary,
      source: config.source || "blinkbox",
      severity: config.severity || "critical",
    },
  };
  if (config.dedupKey) payload.dedup_key = config.dedupKey;
  if (config.component) payload.payload.component = config.component;
  if (config.eventClass) payload.payload.class = config.eventClass;
  const { data } = await axios.post(EVENTS_URL, payload, { timeout: 15000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key, message: data.message };
}

async function opResolveEvent(config) {
  let e = need(config, "routingKey", "resolveEvent"); if (e) return e;
  e = need(config, "dedupKey", "resolveEvent"); if (e) return e;
  const { data } = await axios.post(EVENTS_URL, { routing_key: config.routingKey, event_action: "resolve", dedup_key: config.dedupKey }, { timeout: 15000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key };
}

async function opAcknowledgeEvent(config) {
  let e = need(config, "routingKey", "acknowledgeEvent"); if (e) return e;
  e = need(config, "dedupKey", "acknowledgeEvent"); if (e) return e;
  const { data } = await axios.post(EVENTS_URL, { routing_key: config.routingKey, event_action: "acknowledge", dedup_key: config.dedupKey }, { timeout: 15000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key };
}

const OPERATIONS = {
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
  listServices: opListServices,
  getService: opGetService,
  createService: opCreateService,
  updateService: opUpdateService,
  deleteService: opDeleteService,
  listEscalationPolicies: opListEscalationPolicies,
  getEscalationPolicy: opGetEscalationPolicy,
  deleteEscalationPolicy: opDeleteEscalationPolicy,
  listSchedules: opListSchedules,
  getSchedule: opGetSchedule,
  listOverrides: opListOverrides,
  createOverride: opCreateOverride,
  listOnCalls: opListOnCalls,
  listUsers: opListUsers,
  getUser: opGetUser,
  getCurrentUser: opGetCurrentUser,
  listContactMethods: opListContactMethods,
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamMembers: opListTeamMembers,
  listPriorities: opListPriorities,
  triggerEvent: opTriggerEvent,
  resolveEvent: opResolveEvent,
  acknowledgeEvent: opAcknowledgeEvent,
};

const EVENT_OPS = new Set(["triggerEvent", "resolveEvent", "acknowledgeEvent"]);

function handleError(err) {
  if (err.message?.startsWith("PagerDuty")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  if (status === 400) throw new Error(`PagerDuty: Bad request — ${msg}`);
  if (status === 401) throw new Error(`PagerDuty: Authentication failed — check your API key.`);
  if (status === 402) throw new Error(`PagerDuty: Plan does not include this feature — ${msg}`);
  if (status === 403) throw new Error(`PagerDuty: Forbidden — ${msg}. Key may lack required permissions.`);
  if (status === 404) throw new Error(`PagerDuty: Not found — ${msg}. Check the ID.`);
  if (status === 409) throw new Error(`PagerDuty: Conflict — ${msg}`);
  if (status === 429) throw new Error(`PagerDuty: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`PagerDuty: ${status ?? "Network"} error — ${msg}`);
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Token token=${token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
    },
  });
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listIncidents";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `PagerDuty: Unknown operation "${op}".`, skipped: true };

    if (EVENT_OPS.has(op)) {
      try {
        return await handler(config);
      } catch (err) {
        handleError(err);
      }
    }

    if (!config.credentialId) {
      return { success: false, error: "PagerDuty: No credential selected — pick a PagerDuty credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "PagerDuty");
    } catch (e) {
      return { success: false, error: `PagerDuty: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = client(token);
    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};

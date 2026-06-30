/**
 * DATADOG NODE — nuclear dispatch
 * Datadog API v1 + v2: metrics, events, monitors, logs, dashboards,
 * downtimes, hosts, SLOs, incidents, synthetics, tags, users, service checks.
 * Auth: API key + Application key (JSON credential), site-aware base URL.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const skip = (op, msg) => ({ success: false, error: `Datadog ${op}: ${msg}`, skipped: true });
const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
const flt = (v, d) => (v === undefined || v === "" ? d : parseFloat(v) || d);
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
const nowSec = () => Math.floor(Date.now() / 1000);

function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

/* ---------------- Metrics ---------------- */

async function opSubmitMetric(config, { v1 }) {
  const metric = config.metricName || config.metric;
  if (!metric) return skip("submitMetric", "'metricName' is required.");
  const series = [{
    metric,
    points: [[nowSec(), flt(config.value, 0)]],
    type: config.metricType || config.type || "gauge",
    tags: config.tags ? csv(config.tags) : [],
  }];
  if (config.host) series[0].host = config.host;
  const { data } = await v1.post("/series", { series });
  return { success: true, status: data.status, metric };
}

async function opQueryMetrics(config, { v1 }) {
  const e = need(config, "query", "queryMetrics"); if (e) return e;
  const now = nowSec();
  const { data } = await v1.get("/query", {
    params: { query: config.query, from: num(config.from, now - 3600), to: num(config.to, now) },
  });
  return { success: true, query: config.query, series: data.series, from_date: data.from_date, to_date: data.to_date };
}

async function opListActiveMetrics(config, { v1 }) {
  const { data } = await v1.get("/metrics", {
    params: { from: num(config.from, nowSec() - 86400), host: config.host, tag_filter: config.tags },
  });
  return { success: true, metrics: data.metrics, count: data.metrics?.length || 0 };
}

async function opGetMetricMetadata(config, { v1 }) {
  const e = need(config, "metricName", "getMetricMetadata"); if (e) return e;
  const { data } = await v1.get(`/metrics/${encodeURIComponent(config.metricName)}`);
  return { success: true, ...data };
}

async function opUpdateMetricMetadata(config, { v1 }) {
  const e = need(config, "metricName", "updateMetricMetadata"); if (e) return e;
  const body = {};
  if (config.description) body.description = config.description;
  if (config.unit) body.unit = config.unit;
  if (config.metricType || config.type) body.type = config.metricType || config.type;
  if (config.perUnit) body.per_unit = config.perUnit;
  const { data } = await v1.put(`/metrics/${encodeURIComponent(config.metricName)}`, body);
  return { success: true, ...data };
}

async function opSearchMetrics(config, { v1 }) {
  const e = need(config, "query", "searchMetrics"); if (e) return e;
  const { data } = await v1.get("/search", { params: { q: `metrics:${config.query}` } });
  return { success: true, metrics: data.results?.metrics || [], count: data.results?.metrics?.length || 0 };
}

/* ---------------- Events ---------------- */

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

/* ---------------- Monitors ---------------- */

async function opCreateMonitor(config, { v1 }) {
  let e = need(config, "name", "createMonitor"); if (e) return e;
  e = need(config, "query", "createMonitor"); if (e) return e;
  const body = {
    name: config.name,
    type: config.type || "metric alert",
    query: config.query,
    message: config.message || "",
  };
  if (config.tags) body.tags = csv(config.tags);
  if (config.priority) body.priority = num(config.priority, undefined);
  const { data } = await v1.post("/monitor", body);
  return { success: true, id: data.id, name: data.name, type: data.type, status: data.overall_state };
}

async function opGetMonitor(config, { v1 }) {
  const id = config.monitorId;
  if (!id) return skip("getMonitor", "'monitorId' is required.");
  const { data } = await v1.get(`/monitor/${encodeURIComponent(id)}`);
  return { success: true, id: data.id, name: data.name, type: data.type, status: data.overall_state, query: data.query };
}

async function opListMonitors(config, { v1 }) {
  const { data } = await v1.get("/monitor", {
    params: { tags: config.tags, name: config.name, monitor_tags: config.monitorTags },
  });
  return { success: true, monitors: data, count: data.length };
}

async function opUpdateMonitor(config, { v1 }) {
  const id = config.monitorId;
  if (!id) return skip("updateMonitor", "'monitorId' is required.");
  const body = {};
  if (config.name) body.name = config.name;
  if (config.query) body.query = config.query;
  if (config.message) body.message = config.message;
  if (config.tags) body.tags = csv(config.tags);
  if (Object.keys(body).length === 0) return skip("updateMonitor", "provide at least one field to update.");
  const { data } = await v1.put(`/monitor/${encodeURIComponent(id)}`, body);
  return { success: true, id: data.id, name: data.name, status: data.overall_state };
}

async function opDeleteMonitor(config, { v1 }) {
  const id = config.monitorId;
  if (!id) return skip("deleteMonitor", "'monitorId' is required.");
  await v1.delete(`/monitor/${encodeURIComponent(id)}`);
  return { success: true, deleted: id };
}

async function opMuteMonitor(config, { v1 }) {
  const id = config.monitorId;
  if (!id) return skip("muteMonitor", "'monitorId' is required.");
  const body = {};
  if (config.end) body.end = num(config.end, undefined);
  if (config.scope) body.scope = config.scope;
  await v1.post(`/monitor/${encodeURIComponent(id)}/mute`, body);
  return { success: true, monitorId: id, muted: true };
}

async function opUnmuteMonitor(config, { v1 }) {
  const id = config.monitorId;
  if (!id) return skip("unmuteMonitor", "'monitorId' is required.");
  const body = config.scope ? { scope: config.scope } : {};
  await v1.post(`/monitor/${encodeURIComponent(id)}/unmute`, body);
  return { success: true, monitorId: id, muted: false };
}

async function opSearchMonitors(config, { v1 }) {
  const { data } = await v1.get("/monitor/search", {
    params: { query: config.query || "", per_page: num(config.limit, 30) },
  });
  return { success: true, monitors: data.monitors, counts: data.counts };
}

/* ---------------- Logs ---------------- */

async function opSendLog(config, { site, headers }) {
  const e = need(config, "message", "sendLog"); if (e) return e;
  const payload = [{
    ddsource: config.source || "blinkbox",
    ddtags: config.ddtags || config.tags || "",
    hostname: config.hostname || config.host || "blinkbox",
    message: config.message,
    service: config.service || "blinkbox",
  }];
  await axios.post(`https://http-intake.logs.${site}/api/v2/logs`, payload, {
    headers: { "DD-API-KEY": headers["DD-API-KEY"], "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { success: true, status: "accepted" };
}

async function opSearchLogs(config, { v2 }) {
  const { data } = await v2.post("/logs/events/search", {
    filter: { query: config.query || "*", from: config.from || "now-1h", to: config.to || "now" },
    page: { limit: num(config.limit, 20) },
    sort: config.sort || "-timestamp",
  });
  return { success: true, logs: data.data, count: data.data?.length || 0 };
}

/* ---------------- Dashboards ---------------- */

async function opListDashboards(config, { v1 }) {
  const { data } = await v1.get("/dashboard");
  return { success: true, dashboards: data.dashboards, count: data.dashboards?.length || 0 };
}

async function opGetDashboard(config, { v1 }) {
  const e = need(config, "dashboardId", "getDashboard"); if (e) return e;
  const { data } = await v1.get(`/dashboard/${encodeURIComponent(config.dashboardId)}`);
  return { success: true, ...data };
}

async function opDeleteDashboard(config, { v1 }) {
  const e = need(config, "dashboardId", "deleteDashboard"); if (e) return e;
  await v1.delete(`/dashboard/${encodeURIComponent(config.dashboardId)}`);
  return { success: true, deleted: config.dashboardId };
}

/* ---------------- Downtimes ---------------- */

async function opListDowntimes(config, { v1 }) {
  const { data } = await v1.get("/downtime", { params: { current_only: config.currentOnly === true } });
  return { success: true, downtimes: data, count: data.length };
}

async function opScheduleDowntime(config, { v1 }) {
  const e = need(config, "scope", "scheduleDowntime"); if (e) return e;
  const body = { scope: csv(config.scope) };
  if (config.from) body.start = num(config.from, undefined);
  if (config.to) body.end = num(config.to, undefined);
  if (config.message) body.message = config.message;
  if (config.monitorId) body.monitor_id = num(config.monitorId, undefined);
  const { data } = await v1.post("/downtime", body);
  return { success: true, id: data.id, active: data.active, scope: data.scope };
}

async function opCancelDowntime(config, { v1 }) {
  const e = need(config, "downtimeId", "cancelDowntime"); if (e) return e;
  await v1.delete(`/downtime/${encodeURIComponent(config.downtimeId)}`);
  return { success: true, canceled: config.downtimeId };
}

/* ---------------- Hosts ---------------- */

async function opListHosts(config, { v1 }) {
  const { data } = await v1.get("/hosts", {
    params: { filter: config.query, count: num(config.limit, 100), sort_field: config.sort },
  });
  return { success: true, hosts: data.host_list, total: data.total_returned };
}

async function opGetHostTotals(config, { v1 }) {
  const { data } = await v1.get("/hosts/totals");
  return { success: true, total_active: data.total_active, total_up: data.total_up };
}

async function opMuteHost(config, { v1 }) {
  const e = need(config, "hostName", "muteHost"); if (e) return e;
  const body = {};
  if (config.end) body.end = num(config.end, undefined);
  if (config.message) body.message = config.message;
  const { data } = await v1.post(`/host/${encodeURIComponent(config.hostName)}/mute`, body);
  return { success: true, ...data };
}

async function opUnmuteHost(config, { v1 }) {
  const e = need(config, "hostName", "unmuteHost"); if (e) return e;
  const { data } = await v1.post(`/host/${encodeURIComponent(config.hostName)}/unmute`, {});
  return { success: true, ...data };
}

/* ---------------- SLOs ---------------- */

async function opListSlos(config, { v1 }) {
  const { data } = await v1.get("/slo", { params: { query: config.query, limit: num(config.limit, 100) } });
  return { success: true, slos: data.data, count: data.data?.length || 0 };
}

async function opGetSlo(config, { v1 }) {
  const e = need(config, "sloId", "getSlo"); if (e) return e;
  const { data } = await v1.get(`/slo/${encodeURIComponent(config.sloId)}`);
  return { success: true, ...data.data };
}

async function opDeleteSlo(config, { v1 }) {
  const e = need(config, "sloId", "deleteSlo"); if (e) return e;
  await v1.delete(`/slo/${encodeURIComponent(config.sloId)}`);
  return { success: true, deleted: config.sloId };
}

/* ---------------- Incidents (v2) ---------------- */

async function opListIncidents(config, { v2 }) {
  const { data } = await v2.get("/incidents", { params: { "page[size]": num(config.limit, 25) } });
  return { success: true, incidents: data.data, count: data.data?.length || 0 };
}

async function opGetIncident(config, { v2 }) {
  const e = need(config, "incidentId", "getIncident"); if (e) return e;
  const { data } = await v2.get(`/incidents/${encodeURIComponent(config.incidentId)}`);
  return { success: true, ...data.data };
}

async function opCreateIncident(config, { v2 }) {
  const e = need(config, "title", "createIncident"); if (e) return e;
  const attributes = { title: config.title, customer_impacted: config.customerImpacted === true };
  if (config.severity) attributes.fields = { severity: { type: "dropdown", value: config.severity } };
  const { data } = await v2.post("/incidents", { data: { type: "incidents", attributes } });
  return { success: true, ...data.data };
}

async function opUpdateIncident(config, { v2 }) {
  const e = need(config, "incidentId", "updateIncident"); if (e) return e;
  const attributes = {};
  if (config.title) attributes.title = config.title;
  if (config.status) attributes.fields = { state: { type: "dropdown", value: config.status } };
  if (Object.keys(attributes).length === 0) return skip("updateIncident", "provide a field to update.");
  const { data } = await v2.patch(`/incidents/${encodeURIComponent(config.incidentId)}`, {
    data: { id: config.incidentId, type: "incidents", attributes },
  });
  return { success: true, ...data.data };
}

/* ---------------- Synthetics ---------------- */

async function opListSyntheticTests(config, { v1 }) {
  const { data } = await v1.get("/synthetics/tests");
  return { success: true, tests: data.tests, count: data.tests?.length || 0 };
}

async function opGetSyntheticTest(config, { v1 }) {
  const e = need(config, "testId", "getSyntheticTest"); if (e) return e;
  const { data } = await v1.get(`/synthetics/tests/${encodeURIComponent(config.testId)}`);
  return { success: true, ...data };
}

async function opTriggerSyntheticTest(config, { v1 }) {
  const e = need(config, "testId", "triggerSyntheticTest"); if (e) return e;
  const { data } = await v1.post("/synthetics/tests/trigger", { tests: [{ public_id: config.testId }] });
  return { success: true, ...data };
}

/* ---------------- Tags ---------------- */

async function opGetHostTags(config, { v1 }) {
  const e = need(config, "hostName", "getHostTags"); if (e) return e;
  const { data } = await v1.get(`/tags/hosts/${encodeURIComponent(config.hostName)}`);
  return { success: true, tags: data.tags, host: data.host };
}

async function opAddHostTags(config, { v1 }) {
  let e = need(config, "hostName", "addHostTags"); if (e) return e;
  e = need(config, "tags", "addHostTags"); if (e) return e;
  const { data } = await v1.post(`/tags/hosts/${encodeURIComponent(config.hostName)}`, { tags: csv(config.tags) });
  return { success: true, ...data };
}

/* ---------------- Users (v2) ---------------- */

async function opListUsers(config, { v2 }) {
  const { data } = await v2.get("/users", { params: { "page[size]": num(config.limit, 25), filter: config.query } });
  return { success: true, users: data.data, count: data.data?.length || 0 };
}

async function opGetUser(config, { v2 }) {
  const e = need(config, "userId", "getUser"); if (e) return e;
  const { data } = await v2.get(`/users/${encodeURIComponent(config.userId)}`);
  return { success: true, ...data.data };
}

/* ---------------- Service Checks ---------------- */

async function opPostServiceCheck(config, { v1 }) {
  let e = need(config, "checkName", "postServiceCheck"); if (e) return e;
  e = need(config, "hostName", "postServiceCheck"); if (e) return e;
  const body = {
    check: config.checkName,
    host_name: config.hostName,
    status: num(config.status, 0),
    message: config.message || "",
  };
  if (config.tags) body.tags = csv(config.tags);
  const { data } = await v1.post("/check_run", body);
  return { success: true, status: data.status };
}

const OPERATIONS = {
  submitMetric: opSubmitMetric,
  queryMetrics: opQueryMetrics,
  getMetrics: opQueryMetrics,
  listActiveMetrics: opListActiveMetrics,
  getMetricMetadata: opGetMetricMetadata,
  updateMetricMetadata: opUpdateMetricMetadata,
  searchMetrics: opSearchMetrics,
  createEvent: opCreateEvent,
  sendEvent: opCreateEvent,
  getEvent: opGetEvent,
  listEvents: opListEvents,
  createMonitor: opCreateMonitor,
  getMonitor: opGetMonitor,
  listMonitors: opListMonitors,
  updateMonitor: opUpdateMonitor,
  deleteMonitor: opDeleteMonitor,
  muteMonitor: opMuteMonitor,
  unmuteMonitor: opUnmuteMonitor,
  searchMonitors: opSearchMonitors,
  sendLog: opSendLog,
  searchLogs: opSearchLogs,
  listLogs: opSearchLogs,
  listDashboards: opListDashboards,
  getDashboard: opGetDashboard,
  deleteDashboard: opDeleteDashboard,
  listDowntimes: opListDowntimes,
  scheduleDowntime: opScheduleDowntime,
  cancelDowntime: opCancelDowntime,
  listHosts: opListHosts,
  getHostTotals: opGetHostTotals,
  muteHost: opMuteHost,
  unmuteHost: opUnmuteHost,
  listSlos: opListSlos,
  getSlo: opGetSlo,
  deleteSlo: opDeleteSlo,
  listIncidents: opListIncidents,
  getIncident: opGetIncident,
  createIncident: opCreateIncident,
  updateIncident: opUpdateIncident,
  listSyntheticTests: opListSyntheticTests,
  getSyntheticTest: opGetSyntheticTest,
  triggerSyntheticTest: opTriggerSyntheticTest,
  getHostTags: opGetHostTags,
  addHostTags: opAddHostTags,
  listUsers: opListUsers,
  getUser: opGetUser,
  postServiceCheck: opPostServiceCheck,
};

function handleError(err) {
  if (err.message?.startsWith("Datadog")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? err.message;
  if (status === 400) throw new Error(`Datadog: Bad request — ${msg}`);
  if (status === 401) throw new Error(`Datadog: Authentication failed — check your API key and Application key.`);
  if (status === 403) throw new Error(`Datadog: Forbidden — ${msg}. App key may lack permissions.`);
  if (status === 404) throw new Error(`Datadog: Not found — ${msg}`);
  if (status === 409) throw new Error(`Datadog: Conflict — ${msg}`);
  if (status === 429) throw new Error(`Datadog: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Datadog: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "submitMetric";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Datadog: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Datadog: No credential selected — pick a Datadog credential.", skipped: true };
    }

    const site = config.site || "datadoghq.com";

    let apiKey, appKey;
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Datadog");
      try {
        const j = JSON.parse(raw);
        apiKey = j.apiKey;
        appKey = j.appKey;
      } catch {
        apiKey = raw;
      }
    } catch (e) {
      return { success: false, error: `Datadog: Could not resolve credential — ${e.message}`, skipped: true };
    }
    if (!apiKey) return { success: false, error: "Datadog: API key required.", skipped: true };

    const headers = {
      "DD-API-KEY": apiKey,
      "DD-APPLICATION-KEY": appKey || "",
      "Content-Type": "application/json",
    };
    const v1 = axios.create({ baseURL: `https://api.${site}/api/v1`, headers, timeout: 15000 });
    const v2 = axios.create({ baseURL: `https://api.${site}/api/v2`, headers, timeout: 15000 });

    try {
      return await handler(config, { v1, v2, site, headers });
    } catch (err) {
      handleError(err);
    }
  },
};

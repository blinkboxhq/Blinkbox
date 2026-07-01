/**
 * Datadog — Monitors.
 */
import { skip, need, num, csv } from "../GenericFunctions.js";

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

export const monitorOperations = {
  createMonitor: opCreateMonitor,
  getMonitor: opGetMonitor,
  listMonitors: opListMonitors,
  updateMonitor: opUpdateMonitor,
  deleteMonitor: opDeleteMonitor,
  muteMonitor: opMuteMonitor,
  unmuteMonitor: opUnmuteMonitor,
  searchMonitors: opSearchMonitors,
};

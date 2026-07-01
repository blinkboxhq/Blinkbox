/**
 * Datadog — Downtimes.
 */
import { need, num, csv } from "../GenericFunctions.js";

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

export const downtimeOperations = {
  listDowntimes: opListDowntimes,
  scheduleDowntime: opScheduleDowntime,
  cancelDowntime: opCancelDowntime,
};

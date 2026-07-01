/**
 * PagerDuty — schedules, overrides & on-calls. Handlers receive `(config, { api })`.
 */
import { csv, need, num, ref, skip } from "../GenericFunctions.js";

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

export const scheduleOperations = {
  listSchedules: opListSchedules,
  getSchedule: opGetSchedule,
  listOverrides: opListOverrides,
  createOverride: opCreateOverride,
  listOnCalls: opListOnCalls,
};

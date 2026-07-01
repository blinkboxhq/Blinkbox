/**
 * Datadog — Hosts.
 */
import { need, num } from "../GenericFunctions.js";

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

export const hostOperations = {
  listHosts: opListHosts,
  getHostTotals: opGetHostTotals,
  muteHost: opMuteHost,
  unmuteHost: opUnmuteHost,
};

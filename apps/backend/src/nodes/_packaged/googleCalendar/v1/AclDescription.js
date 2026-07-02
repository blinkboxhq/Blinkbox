/**
 * Google Calendar — sharing / ACL: listAcl, shareCalendar, unshareCalendar.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, authHeaders, cal } from "../GenericFunctions.js";

async function opListAcl(config, token) {
  const res = await axios.get(`${BASE}/calendars/${cal(config)}/acl`, { headers: authHeaders(token), timeout: 15000 });
  return { rules: res.data.items?.map((r) => ({ id: r.id, role: r.role, scopeType: r.scope?.type, scopeValue: r.scope?.value })) ?? [], count: res.data.items?.length ?? 0 };
}

async function opShareCalendar(config, token) {
  if (!config.shareEmail && config.scopeType !== "default") return { success: false, error: "Google Calendar shareCalendar: 'shareEmail' is required.", skipped: true };
  const body = { role: config.role || "reader", scope: { type: config.scopeType || "user", value: config.shareEmail || undefined } };
  const res = await axios.post(`${BASE}/calendars/${cal(config)}/acl`, body, {
    headers: authHeaders(token, true),
    timeout: 15000,
    params: { sendNotifications: config.sendNotifications !== false },
  });
  return { id: res.data.id, role: res.data.role, scope: res.data.scope?.value, shared: true };
}

async function opUnshareCalendar(config, token) {
  if (!config.ruleId) return { success: false, error: "Google Calendar unshareCalendar: 'ruleId' is required (from listAcl).", skipped: true };
  await axios.delete(`${BASE}/calendars/${cal(config)}/acl/${encodeURIComponent(config.ruleId)}`, { headers: authHeaders(token), timeout: 15000 });
  return { unshared: true, ruleId: config.ruleId };
}

export const aclOperations = {
  listAcl: opListAcl,
  shareCalendar: opShareCalendar,
  unshareCalendar: opUnshareCalendar,
};

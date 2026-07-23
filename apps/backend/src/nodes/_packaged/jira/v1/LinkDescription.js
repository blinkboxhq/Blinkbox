/**
 * Jira — issue links & watchers (link, list link types, add/get watchers).
 * Handlers receive `(config, ctx)`.
 */
import { axios } from "../GenericFunctions.js";

async function opLinkIssues(config, ctx) {
  if (!config.inwardIssue || !config.outwardIssue) return { success: false, error: "Jira linkIssues: 'inwardIssue' and 'outwardIssue' keys are required.", skipped: true };
  await axios.post(`${ctx.BASE}/issueLink`, {
    type: { name: config.linkType || "Relates" },
    inwardIssue: { key: config.inwardIssue },
    outwardIssue: { key: config.outwardIssue },
  }, { headers: ctx.headers, timeout: 120000 });
  return { linked: true, type: config.linkType || "Relates" };
}

async function opListLinkTypes(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/issueLinkType`, { headers: ctx.headers, timeout: 120000 });
  return { linkTypes: res.data.issueLinkTypes?.map((t) => ({ id: t.id, name: t.name, inward: t.inward, outward: t.outward })) ?? [] };
}

async function opAddWatcher(config, ctx) {
  if (!config.issueKey || !config.accountId) return { success: false, error: "Jira addWatcher: 'issueKey' and 'accountId' are required.", skipped: true };
  await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/watchers`, JSON.stringify(config.accountId), { headers: ctx.headers, timeout: 120000 });
  return { added: true, issueKey: config.issueKey };
}

async function opGetWatchers(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getWatchers: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/watchers`, { headers: ctx.headers, timeout: 120000 });
  return { watchCount: res.data.watchCount, watchers: res.data.watchers?.map((w) => ({ accountId: w.accountId, name: w.displayName })) ?? [] };
}

export const linkOperations = {
  linkIssues: opLinkIssues,
  listLinkTypes: opListLinkTypes,
  addWatcher: opAddWatcher,
  getWatchers: opGetWatchers,
};

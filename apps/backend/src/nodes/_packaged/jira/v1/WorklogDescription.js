/**
 * Jira — worklogs (add, get).
 * Handlers receive `(config, ctx)`.
 */
import { axios, adf, LIMIT } from "../GenericFunctions.js";

async function opAddWorklog(config, ctx) {
  if (!config.issueKey || !config.timeSpent) return { success: false, error: "Jira addWorklog: 'issueKey' and 'timeSpent' (e.g. 1h 30m) are required.", skipped: true };
  const body = { timeSpent: config.timeSpent };
  if (config.comment) body.comment = adf(config.comment);
  if (config.started) body.started = config.started;
  const res = await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/worklog`, body, { headers: ctx.headers, timeout: 120000 });
  return { id: res.data.id, timeSpent: res.data.timeSpent, created: res.data.created };
}

async function opGetWorklogs(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getWorklogs: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/worklog`, { headers: ctx.headers, timeout: 120000, params: { maxResults: LIMIT(config) } });
  return { worklogs: res.data.worklogs?.map((w) => ({ id: w.id, author: w.author?.displayName, timeSpent: w.timeSpent, started: w.started })) ?? [], total: res.data.total };
}

export const worklogOperations = {
  addWorklog: opAddWorklog,
  getWorklogs: opGetWorklogs,
};

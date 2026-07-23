/**
 * Jira — issues (create, get, update, delete, assign, search).
 * Handlers receive `(config, ctx)` where ctx = { domain, headers, BASE, AGILE }.
 */
import { axios, adf, csv, LIMIT } from "../GenericFunctions.js";

async function opCreateIssue(config, ctx) {
  if (!config.project || !config.summary) return { success: false, error: "Jira createIssue: 'project' key and 'summary' are required.", skipped: true };
  const fields = {
    project: { key: config.project },
    issuetype: { name: config.issueType || "Task" },
    summary: config.summary,
  };
  if (config.description) fields.description = adf(config.description);
  if (config.assignee) fields.assignee = { id: config.assignee };
  if (config.priority) fields.priority = { name: config.priority };
  if (config.labels) fields.labels = csv(config.labels);
  if (config.parent) fields.parent = { key: config.parent };
  if (config.dueDate) fields.duedate = config.dueDate;
  const res = await axios.post(`${ctx.BASE}/issue`, { fields }, { headers: ctx.headers, timeout: 120000 });
  return { id: res.data.id, key: res.data.key, url: `https://${ctx.domain}/browse/${res.data.key}` };
}

async function opGetIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getIssue: 'issueKey' (e.g. PROJ-123) is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { headers: ctx.headers, timeout: 120000 });
  const f = res.data.fields;
  return { id: res.data.id, key: res.data.key, summary: f.summary, status: f.status?.name, assignee: f.assignee?.displayName, reporter: f.reporter?.displayName, priority: f.priority?.name, labels: f.labels, issueType: f.issuetype?.name, created: f.created, updated: f.updated, url: `https://${ctx.domain}/browse/${res.data.key}` };
}

async function opUpdateIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira updateIssue: 'issueKey' is required.", skipped: true };
  const fields = {};
  if (config.summary) fields.summary = config.summary;
  if (config.assignee) fields.assignee = { id: config.assignee };
  if (config.priority) fields.priority = { name: config.priority };
  if (config.labels) fields.labels = csv(config.labels);
  if (config.dueDate) fields.duedate = config.dueDate;
  if (config.description) fields.description = adf(config.description);
  await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { fields }, { headers: ctx.headers, timeout: 120000 });
  return { updated: true, issueKey: config.issueKey };
}

async function opDeleteIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira deleteIssue: 'issueKey' is required.", skipped: true };
  await axios.delete(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { headers: ctx.headers, timeout: 120000, params: { deleteSubtasks: config.deleteSubtasks ? "true" : "false" } });
  return { deleted: true, issueKey: config.issueKey };
}

async function opAssignIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira assignIssue: 'issueKey' is required.", skipped: true };
  await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/assignee`, { accountId: config.assignee || null }, { headers: ctx.headers, timeout: 120000 });
  return { assigned: true, issueKey: config.issueKey, assignee: config.assignee || "unassigned" };
}

async function opSearchIssues(config, ctx) {
  const jql = config.jql || "order by created DESC";
  const res = await axios.post(`${ctx.BASE}/search`, { jql, maxResults: LIMIT(config), fields: ["summary", "status", "assignee", "priority", "created", "issuetype"] }, { headers: ctx.headers, timeout: 120000 });
  return { issues: res.data.issues?.map((i) => ({ id: i.id, key: i.key, summary: i.fields.summary, status: i.fields.status?.name, assignee: i.fields.assignee?.displayName, priority: i.fields.priority?.name, url: `https://${ctx.domain}/browse/${i.key}` })) ?? [], total: res.data.total };
}

export const issueOperations = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  updateIssue: opUpdateIssue,
  deleteIssue: opDeleteIssue,
  assignIssue: opAssignIssue,
  searchIssues: opSearchIssues,
};

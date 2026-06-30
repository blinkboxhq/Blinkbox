/**
 * JIRA NODE
 * Interact with Jira Cloud via the REST API v3 (+ Agile API v1.0).
 *
 * Auth: Basic auth — base64("email:apiToken") stored in vault,
 *       or store as "email:apiToken" and this node encodes it.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getAuth(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Jira");
  if (raw.includes(":")) return Buffer.from(raw).toString("base64");
  return raw;
}

function adf(text) {
  return { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: String(text) }] }] };
}

function csv(v) {
  return v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

const LIMIT = (config, def = 20) => Math.min(Number(config.limit || def), 100);

/* ------------------------------ ISSUES -------------------------- */

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
  const res = await axios.post(`${ctx.BASE}/issue`, { fields }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, key: res.data.key, url: `https://${ctx.domain}/browse/${res.data.key}` };
}

async function opGetIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getIssue: 'issueKey' (e.g. PROJ-123) is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { headers: ctx.headers, timeout: 15000 });
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
  await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { fields }, { headers: ctx.headers, timeout: 15000 });
  return { updated: true, issueKey: config.issueKey };
}

async function opDeleteIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira deleteIssue: 'issueKey' is required.", skipped: true };
  await axios.delete(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}`, { headers: ctx.headers, timeout: 15000, params: { deleteSubtasks: config.deleteSubtasks ? "true" : "false" } });
  return { deleted: true, issueKey: config.issueKey };
}

async function opAssignIssue(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira assignIssue: 'issueKey' is required.", skipped: true };
  await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/assignee`, { accountId: config.assignee || null }, { headers: ctx.headers, timeout: 15000 });
  return { assigned: true, issueKey: config.issueKey, assignee: config.assignee || "unassigned" };
}

async function opSearchIssues(config, ctx) {
  const jql = config.jql || "order by created DESC";
  const res = await axios.post(`${ctx.BASE}/search`, { jql, maxResults: LIMIT(config), fields: ["summary", "status", "assignee", "priority", "created", "issuetype"] }, { headers: ctx.headers, timeout: 15000 });
  return { issues: res.data.issues?.map((i) => ({ id: i.id, key: i.key, summary: i.fields.summary, status: i.fields.status?.name, assignee: i.fields.assignee?.displayName, priority: i.fields.priority?.name, url: `https://${ctx.domain}/browse/${i.key}` })) ?? [], total: res.data.total };
}

/* --------------------------- TRANSITIONS ------------------------ */

async function opTransitionIssue(config, ctx) {
  if (!config.issueKey || !config.transitionId) return { success: false, error: "Jira transitionIssue: 'issueKey' and 'transitionId' are required.", skipped: true };
  const body = { transition: { id: config.transitionId } };
  if (config.comment) body.update = { comment: [{ add: { body: adf(config.comment) } }] };
  await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/transitions`, body, { headers: ctx.headers, timeout: 15000 });
  return { transitioned: true, issueKey: config.issueKey };
}

async function opListTransitions(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira listTransitions: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/transitions`, { headers: ctx.headers, timeout: 15000 });
  return { transitions: res.data.transitions?.map((t) => ({ id: t.id, name: t.name, to: t.to?.name })) ?? [] };
}

/* ---------------------------- COMMENTS -------------------------- */

async function opAddComment(config, ctx) {
  if (!config.issueKey || !config.comment) return { success: false, error: "Jira addComment: 'issueKey' and 'comment' are required.", skipped: true };
  const res = await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment`, { body: adf(config.comment) }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, created: res.data.created };
}

async function opGetComments(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getComments: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config) } });
  return { comments: res.data.comments?.map((c) => ({ id: c.id, author: c.author?.displayName, body: c.body?.content?.[0]?.content?.[0]?.text, created: c.created })) ?? [], total: res.data.total };
}

async function opUpdateComment(config, ctx) {
  if (!config.issueKey || !config.commentId || !config.comment) return { success: false, error: "Jira updateComment: 'issueKey', 'commentId' and 'comment' are required.", skipped: true };
  const res = await axios.put(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment/${encodeURIComponent(config.commentId)}`, { body: adf(config.comment) }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, updated: res.data.updated };
}

async function opDeleteComment(config, ctx) {
  if (!config.issueKey || !config.commentId) return { success: false, error: "Jira deleteComment: 'issueKey' and 'commentId' are required.", skipped: true };
  await axios.delete(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/comment/${encodeURIComponent(config.commentId)}`, { headers: ctx.headers, timeout: 15000 });
  return { deleted: true, commentId: config.commentId };
}

/* ------------------------ LINKS / WATCHERS ---------------------- */

async function opLinkIssues(config, ctx) {
  if (!config.inwardIssue || !config.outwardIssue) return { success: false, error: "Jira linkIssues: 'inwardIssue' and 'outwardIssue' keys are required.", skipped: true };
  await axios.post(`${ctx.BASE}/issueLink`, {
    type: { name: config.linkType || "Relates" },
    inwardIssue: { key: config.inwardIssue },
    outwardIssue: { key: config.outwardIssue },
  }, { headers: ctx.headers, timeout: 15000 });
  return { linked: true, type: config.linkType || "Relates" };
}

async function opListLinkTypes(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/issueLinkType`, { headers: ctx.headers, timeout: 15000 });
  return { linkTypes: res.data.issueLinkTypes?.map((t) => ({ id: t.id, name: t.name, inward: t.inward, outward: t.outward })) ?? [] };
}

async function opAddWatcher(config, ctx) {
  if (!config.issueKey || !config.accountId) return { success: false, error: "Jira addWatcher: 'issueKey' and 'accountId' are required.", skipped: true };
  await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/watchers`, JSON.stringify(config.accountId), { headers: ctx.headers, timeout: 15000 });
  return { added: true, issueKey: config.issueKey };
}

async function opGetWatchers(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getWatchers: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/watchers`, { headers: ctx.headers, timeout: 15000 });
  return { watchCount: res.data.watchCount, watchers: res.data.watchers?.map((w) => ({ accountId: w.accountId, name: w.displayName })) ?? [] };
}

/* ----------------------------- WORKLOG -------------------------- */

async function opAddWorklog(config, ctx) {
  if (!config.issueKey || !config.timeSpent) return { success: false, error: "Jira addWorklog: 'issueKey' and 'timeSpent' (e.g. 1h 30m) are required.", skipped: true };
  const body = { timeSpent: config.timeSpent };
  if (config.comment) body.comment = adf(config.comment);
  if (config.started) body.started = config.started;
  const res = await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/worklog`, body, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, timeSpent: res.data.timeSpent, created: res.data.created };
}

async function opGetWorklogs(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira getWorklogs: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/worklog`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config) } });
  return { worklogs: res.data.worklogs?.map((w) => ({ id: w.id, author: w.author?.displayName, timeSpent: w.timeSpent, started: w.started })) ?? [], total: res.data.total };
}

/* ---------------------------- PROJECTS -------------------------- */

async function opListProjects(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/project/search`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config, 50), query: config.query || undefined } });
  return { projects: res.data.values?.map((p) => ({ id: p.id, key: p.key, name: p.name, type: p.projectTypeKey })) ?? [], total: res.data.total };
}

async function opGetProject(config, ctx) {
  if (!config.project) return { success: false, error: "Jira getProject: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}`, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, key: res.data.key, name: res.data.name, lead: res.data.lead?.displayName, type: res.data.projectTypeKey, url: res.data.self };
}

async function opGetProjectStatuses(config, ctx) {
  if (!config.project) return { success: false, error: "Jira getProjectStatuses: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/statuses`, { headers: ctx.headers, timeout: 15000 });
  return { issueTypes: res.data.map((t) => ({ name: t.name, statuses: t.statuses?.map((s) => s.name) })) };
}

async function opListVersions(config, ctx) {
  if (!config.project) return { success: false, error: "Jira listVersions: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/versions`, { headers: ctx.headers, timeout: 15000 });
  return { versions: res.data.map((v) => ({ id: v.id, name: v.name, released: v.released, releaseDate: v.releaseDate })) };
}

async function opCreateVersion(config, ctx) {
  if (!config.projectId || !config.name) return { success: false, error: "Jira createVersion: 'projectId' and 'name' are required.", skipped: true };
  const res = await axios.post(`${ctx.BASE}/version`, { projectId: Number(config.projectId), name: config.name, description: config.description || undefined, releaseDate: config.releaseDate || undefined }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, name: res.data.name, created: true };
}

async function opListComponents(config, ctx) {
  if (!config.project) return { success: false, error: "Jira listComponents: 'project' key is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/project/${encodeURIComponent(config.project)}/components`, { headers: ctx.headers, timeout: 15000 });
  return { components: res.data.map((c) => ({ id: c.id, name: c.name, lead: c.lead?.displayName })) };
}

/* ------------------------------ USERS --------------------------- */

async function opGetCurrentUser(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/myself`, { headers: ctx.headers, timeout: 15000 });
  return { accountId: res.data.accountId, name: res.data.displayName, email: res.data.emailAddress, timeZone: res.data.timeZone };
}

async function opSearchUsers(config, ctx) {
  if (!config.query) return { success: false, error: "Jira searchUsers: 'query' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/user/search`, { headers: ctx.headers, timeout: 15000, params: { query: config.query, maxResults: LIMIT(config) } });
  return { users: res.data.map((u) => ({ accountId: u.accountId, name: u.displayName, email: u.emailAddress, active: u.active })) };
}

/* ---------------------------- METADATA -------------------------- */

async function opListIssueTypes(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/issuetype`, { headers: ctx.headers, timeout: 15000 });
  return { issueTypes: res.data.map((t) => ({ id: t.id, name: t.name, subtask: t.subtask })) };
}

async function opListPriorities(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/priority`, { headers: ctx.headers, timeout: 15000 });
  return { priorities: res.data.map((p) => ({ id: p.id, name: p.name })) };
}

async function opGetFields(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/field`, { headers: ctx.headers, timeout: 15000 });
  return { fields: res.data.map((f) => ({ id: f.id, name: f.name, custom: f.custom })).slice(0, 200), count: res.data.length };
}

/* ------------------------- AGILE (BOARDS) ----------------------- */

async function opListBoards(config, ctx) {
  const res = await axios.get(`${ctx.AGILE}/board`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config, 50), projectKeyOrId: config.project || undefined } });
  return { boards: res.data.values?.map((b) => ({ id: b.id, name: b.name, type: b.type })) ?? [], total: res.data.total };
}

async function opGetBoardIssues(config, ctx) {
  if (!config.boardId) return { success: false, error: "Jira getBoardIssues: 'boardId' is required.", skipped: true };
  const res = await axios.get(`${ctx.AGILE}/board/${encodeURIComponent(config.boardId)}/issue`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config), jql: config.jql || undefined } });
  return { issues: res.data.issues?.map((i) => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name })) ?? [], total: res.data.total };
}

async function opListSprints(config, ctx) {
  if (!config.boardId) return { success: false, error: "Jira listSprints: 'boardId' is required.", skipped: true };
  const res = await axios.get(`${ctx.AGILE}/board/${encodeURIComponent(config.boardId)}/sprint`, { headers: ctx.headers, timeout: 15000, params: { maxResults: LIMIT(config), state: config.sprintState || undefined } });
  return { sprints: res.data.values?.map((s) => ({ id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate })) ?? [] };
}

async function opCreateSprint(config, ctx) {
  if (!config.boardId || !config.name) return { success: false, error: "Jira createSprint: 'boardId' and 'name' are required.", skipped: true };
  const res = await axios.post(`${ctx.AGILE}/sprint`, { originBoardId: Number(config.boardId), name: config.name, startDate: config.startDate || undefined, endDate: config.endDate || undefined, goal: config.goal || undefined }, { headers: ctx.headers, timeout: 15000 });
  return { id: res.data.id, name: res.data.name, state: res.data.state, created: true };
}

async function opMoveIssuesToSprint(config, ctx) {
  if (!config.sprintId || !config.issueKeys) return { success: false, error: "Jira moveIssuesToSprint: 'sprintId' and 'issueKeys' are required.", skipped: true };
  await axios.post(`${ctx.AGILE}/sprint/${encodeURIComponent(config.sprintId)}/issue`, { issues: csv(config.issueKeys) }, { headers: ctx.headers, timeout: 15000 });
  return { moved: true, sprintId: config.sprintId, count: csv(config.issueKeys).length };
}

const OPERATIONS = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  updateIssue: opUpdateIssue,
  deleteIssue: opDeleteIssue,
  assignIssue: opAssignIssue,
  searchIssues: opSearchIssues,
  transitionIssue: opTransitionIssue,
  listTransitions: opListTransitions,
  addComment: opAddComment,
  getComments: opGetComments,
  updateComment: opUpdateComment,
  deleteComment: opDeleteComment,
  linkIssues: opLinkIssues,
  listLinkTypes: opListLinkTypes,
  addWatcher: opAddWatcher,
  getWatchers: opGetWatchers,
  addWorklog: opAddWorklog,
  getWorklogs: opGetWorklogs,
  listProjects: opListProjects,
  getProject: opGetProject,
  getProjectStatuses: opGetProjectStatuses,
  listVersions: opListVersions,
  createVersion: opCreateVersion,
  listComponents: opListComponents,
  getCurrentUser: opGetCurrentUser,
  searchUsers: opSearchUsers,
  listIssueTypes: opListIssueTypes,
  listPriorities: opListPriorities,
  getFields: opGetFields,
  listBoards: opListBoards,
  getBoardIssues: opGetBoardIssues,
  listSprints: opListSprints,
  createSprint: opCreateSprint,
  moveIssuesToSprint: opMoveIssuesToSprint,
};

function handleError(err) {
  if (err.message?.startsWith("Jira")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errorMessages?.join(", ") || err.response?.data?.message || (err.response?.data?.errors && JSON.stringify(err.response.data.errors)) || err.message;
  if (status === 401 || status === 403) throw new Error(`Jira: Auth failed — ${msg}. Check email and API token.`);
  if (status === 404) throw new Error(`Jira: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Jira: Validation error — ${msg}`);
  if (status === 429) throw new Error("Jira: Rate limit exceeded. Slow down requests.");
  throw new Error(`Jira: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "searchIssues", domain } = config;

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `Jira: Unknown operation "${operation}".`, skipped: true };

    if (!domain) return { success: false, error: "Jira: 'domain' is required (e.g. mycompany.atlassian.net).", skipped: true };
    if (!config.credentialId) return { success: false, error: "Jira: No credential selected — pick a Jira API token credential.", skipped: true };

    let base64Auth;
    try {
      base64Auth = await getAuth(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Jira: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const ctx = {
      domain,
      headers: { Authorization: `Basic ${base64Auth}`, "Content-Type": "application/json", Accept: "application/json" },
      BASE: `https://${domain}/rest/api/3`,
      AGILE: `https://${domain}/rest/agile/1.0`,
    };

    try {
      return await handler(config, ctx);
    } catch (err) {
      handleError(err);
    }
  },
};

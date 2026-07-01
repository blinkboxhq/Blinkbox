/**
 * Sentry — issues. Handlers receive `(config, ctx, context)` where
 * ctx = { org, headers }.
 */
import { BASE, enc, LIMIT, skip, get, post, put, del, needOrg, needIssue } from "../GenericFunctions.js";

async function opListIssues(config, ctx) {
  const e = needOrg(config, ctx, "listIssues"); if (e) return e;
  const project = config.project ? `&project=${enc(config.project)}` : "";
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/issues/?limit=${LIMIT(config)}&query=${enc(config.query || "is:unresolved")}${project}`, ctx);
  return { issues: data, count: data.length };
}

async function opGetIssue(config, ctx) {
  const e = needIssue(config, "getIssue"); if (e) return e;
  return get(`${BASE}/issues/${enc(config.issueId)}/`, ctx);
}

async function opUpdateIssue(config, ctx) {
  const e = needIssue(config, "updateIssue"); if (e) return e;
  const update = {};
  if (config.status) update.status = config.status;
  if (config.assignedTo) update.assignedTo = config.assignedTo;
  if (config.hasSeen !== undefined && config.hasSeen !== "") update.hasSeen = Boolean(config.hasSeen);
  if (config.isBookmarked !== undefined && config.isBookmarked !== "") update.isBookmarked = Boolean(config.isBookmarked);
  if (!Object.keys(update).length) return skip("updateIssue", "provide at least one field (status, assignedTo, hasSeen, isBookmarked)");
  const data = await put(`${BASE}/issues/${enc(config.issueId)}/`, update, ctx);
  return { id: config.issueId, status: data.status, assignedTo: data.assignedTo };
}

async function opResolveIssue(config, ctx) {
  const e = needIssue(config, "resolveIssue"); if (e) return e;
  const data = await put(`${BASE}/issues/${enc(config.issueId)}/`, { status: "resolved" }, ctx);
  return { id: config.issueId, status: data.status, resolved: true };
}

async function opIgnoreIssue(config, ctx) {
  const e = needIssue(config, "ignoreIssue"); if (e) return e;
  const data = await put(`${BASE}/issues/${enc(config.issueId)}/`, { status: "ignored" }, ctx);
  return { id: config.issueId, status: data.status, ignored: true };
}

async function opAssignIssue(config, ctx) {
  const e = needIssue(config, "assignIssue"); if (e) return e;
  if (!config.assignee) return skip("assignIssue", "'assignee' (username or email) required");
  const data = await put(`${BASE}/issues/${enc(config.issueId)}/`, { assignedTo: config.assignee }, ctx);
  return { id: config.issueId, assignedTo: data.assignedTo };
}

async function opDeleteIssue(config, ctx) {
  const e = needIssue(config, "deleteIssue"); if (e) return e;
  await del(`${BASE}/issues/${enc(config.issueId)}/`, ctx);
  return { id: config.issueId, deleted: true };
}

async function opListEvents(config, ctx) {
  const e = needIssue(config, "listEvents"); if (e) return e;
  const data = await get(`${BASE}/issues/${enc(config.issueId)}/events/?limit=${LIMIT(config)}`, ctx);
  return { events: data, count: data.length };
}

async function opLatestEvent(config, ctx) {
  const e = needIssue(config, "latestEvent"); if (e) return e;
  return get(`${BASE}/issues/${enc(config.issueId)}/events/latest/`, ctx);
}

async function opListIssueComments(config, ctx) {
  const e = needIssue(config, "listIssueComments"); if (e) return e;
  const data = await get(`${BASE}/issues/${enc(config.issueId)}/comments/`, ctx);
  return { comments: data, count: data.length };
}

async function opAddIssueComment(config, ctx) {
  const e = needIssue(config, "addIssueComment"); if (e) return e;
  if (!config.text) return skip("addIssueComment", "'text' required");
  const data = await post(`${BASE}/issues/${enc(config.issueId)}/comments/`, { text: config.text }, ctx);
  return { id: data.id, text: data.data?.text || config.text, created: true };
}

async function opListIssueTags(config, ctx) {
  const e = needIssue(config, "listIssueTags"); if (e) return e;
  const data = await get(`${BASE}/issues/${enc(config.issueId)}/tags/`, ctx);
  return { tags: data };
}

export const issueOperations = {
  listIssues: opListIssues,
  getIssue: opGetIssue,
  updateIssue: opUpdateIssue,
  resolveIssue: opResolveIssue,
  ignoreIssue: opIgnoreIssue,
  assignIssue: opAssignIssue,
  deleteIssue: opDeleteIssue,
  listEvents: opListEvents,
  latestEvent: opLatestEvent,
  listIssueComments: opListIssueComments,
  addIssueComment: opAddIssueComment,
  listIssueTags: opListIssueTags,
};

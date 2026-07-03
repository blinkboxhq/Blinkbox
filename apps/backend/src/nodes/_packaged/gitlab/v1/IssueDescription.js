/**
 * GITLAB — Issue resource. listIssues/createIssue/updateIssue/commentIssue
 * preserved verbatim from the monolith; getIssue, closeIssue, listIssueNotes,
 * deleteIssue added for parity. Handlers receive (config, client).
 */
import { requireProject, clampLimit } from "../GenericFunctions.js";

function issueOut(i) {
  return { id: i.id, iid: i.iid, title: i.title, state: i.state, web_url: i.web_url, author: i.author?.username };
}

async function opListIssues(config, client) {
  const api = requireProject(client);
  const res = await client.get(`${api}/issues`, { state: config.state || "opened", per_page: clampLimit(config.limit) });
  return { items: res.data.map(issueOut), count: res.data.length };
}

async function opGetIssue(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab getIssue: 'issueIid' is required.", skipped: true };
  const res = await client.get(`${api}/issues/${config.issueIid}`);
  const i = res.data;
  return { ...issueOut(i), description: i.description, labels: i.labels, assignees: (i.assignees || []).map((a) => a.username), created_at: i.created_at, updated_at: i.updated_at };
}

async function opCreateIssue(config, client) {
  const api = requireProject(client);
  if (!config.title) return { success: false, error: "gitlab createIssue: 'title' is required.", skipped: true };
  const res = await client.post(`${api}/issues`, { title: config.title, description: config.description, labels: config.labels });
  return issueOut(res.data);
}

async function opUpdateIssue(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab updateIssue: 'issueIid' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = config.title;
  if (config.description) body.description = config.description;
  if (config.labels) body.labels = config.labels;
  if (config.state_event) body.state_event = config.state_event;
  const res = await client.put(`${api}/issues/${config.issueIid}`, body);
  return issueOut(res.data);
}

async function opCloseIssue(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab closeIssue: 'issueIid' is required.", skipped: true };
  const res = await client.put(`${api}/issues/${config.issueIid}`, { state_event: "close" });
  return issueOut(res.data);
}

async function opCommentIssue(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab commentIssue: 'issueIid' is required.", skipped: true };
  if (!config.body) return { success: false, error: "gitlab commentIssue: 'body' is required.", skipped: true };
  const res = await client.post(`${api}/issues/${config.issueIid}/notes`, { body: config.body });
  return { id: res.data.id, body: res.data.body, author: res.data.author?.username, created_at: res.data.created_at };
}

async function opListIssueNotes(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab listIssueNotes: 'issueIid' is required.", skipped: true };
  const res = await client.get(`${api}/issues/${config.issueIid}/notes`, { per_page: clampLimit(config.limit) });
  return { items: res.data.map((n) => ({ id: n.id, body: n.body, author: n.author?.username, created_at: n.created_at })), count: res.data.length };
}

async function opDeleteIssue(config, client) {
  const api = requireProject(client);
  if (!config.issueIid) return { success: false, error: "gitlab deleteIssue: 'issueIid' is required.", skipped: true };
  await client.del(`${api}/issues/${config.issueIid}`);
  return { deleted: true, issueIid: config.issueIid };
}

export const issueOperations = {
  listIssues: opListIssues,
  getIssue: opGetIssue,
  createIssue: opCreateIssue,
  updateIssue: opUpdateIssue,
  closeIssue: opCloseIssue,
  commentIssue: opCommentIssue,
  listIssueNotes: opListIssueNotes,
  deleteIssue: opDeleteIssue,
};

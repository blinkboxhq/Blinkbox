/**
 * GitHub — issues, labels & comments. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers, repoPath, csv, PER_PAGE } from "../GenericFunctions.js";

async function opCreateIssue(config, token) {
  if (!config.title) return { success: false, error: "GitHub createIssue: 'title' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues`, {
    title: config.title, body: config.body || undefined,
    labels: csv(config.labels), assignees: csv(config.assignees), milestone: config.milestone ? Number(config.milestone) : undefined,
  }, { headers: headers(token), timeout: 120000 });
  return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
}

async function opGetIssue(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub getIssue: 'issueNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, { headers: headers(token), timeout: 120000 });
  return { number: res.data.number, title: res.data.title, body: res.data.body, state: res.data.state, url: res.data.html_url, author: res.data.user?.login, labels: res.data.labels?.map((l) => l.name), assignees: res.data.assignees?.map((a) => a.login) };
}

async function opListIssues(config, token) {
  const res = await axios.get(`${repoPath(config)}/issues`, {
    headers: headers(token), timeout: 120000,
    params: { state: config.state || "open", per_page: PER_PAGE(config), labels: config.labels || undefined, assignee: config.assignee || undefined, sort: config.sort || undefined, page: config.page || undefined },
  });
  return { issues: res.data.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, author: i.user?.login, isPullRequest: !!i.pull_request })), count: res.data.length };
}

async function opUpdateIssue(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub updateIssue: 'issueNumber' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = config.title;
  if (config.body != null) body.body = config.body;
  if (config.state) body.state = config.state;
  if (config.labels) body.labels = csv(config.labels);
  if (config.assignees) body.assignees = csv(config.assignees);
  if (config.milestone) body.milestone = Number(config.milestone);
  const res = await axios.patch(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, body, { headers: headers(token), timeout: 120000 });
  return { number: res.data.number, state: res.data.state, url: res.data.html_url, updated: true };
}

async function opCloseIssue(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub closeIssue: 'issueNumber' is required.", skipped: true };
  const res = await axios.patch(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, { state: "closed", state_reason: config.stateReason || "completed" }, { headers: headers(token), timeout: 120000 });
  return { number: res.data.number, state: res.data.state, closed: true };
}

async function opAddLabels(config, token) {
  if (!config.issueNumber || !config.labels) return { success: false, error: "GitHub addLabels: 'issueNumber' and 'labels' are required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/labels`, { labels: csv(config.labels) }, { headers: headers(token), timeout: 120000 });
  return { labels: res.data.map((l) => l.name), count: res.data.length };
}

async function opCreateComment(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub createComment: 'issueNumber' is required.", skipped: true };
  if (!config.body) return { success: false, error: "GitHub createComment: 'body' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/comments`, { body: config.body }, { headers: headers(token), timeout: 120000 });
  return { id: res.data.id, url: res.data.html_url, body: res.data.body };
}

async function opListComments(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub listComments: 'issueNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/comments`, { headers: headers(token), timeout: 120000, params: { per_page: PER_PAGE(config) } });
  return { comments: res.data.map((c) => ({ id: c.id, author: c.user?.login, body: c.body, url: c.html_url })), count: res.data.length };
}

export const issueOperations = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  listIssues: opListIssues,
  updateIssue: opUpdateIssue,
  closeIssue: opCloseIssue,
  addLabels: opAddLabels,
  createComment: opCreateComment,
  listComments: opListComments,
};

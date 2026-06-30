/**
 * SENTRY NODE
 * Manage issues, projects, releases, teams and org data via the Sentry
 * Web API (https://sentry.io/api/0). Plus DSN-based event capture.
 *
 * Auth: Sentry API auth token (Bearer). captureEvent uses the project DSN.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://sentry.io/api/0";
const enc = encodeURIComponent;
const csv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = (config, def = 25) => Math.min(Number(config.limit || def), 100);

function skip(op, msg) {
  return { success: false, error: `Sentry ${op}: ${msg}.`, skipped: true };
}

const get = (url, ctx) => axios.get(url, { headers: ctx.headers, timeout: 15000 }).then((r) => r.data);
const post = (url, body, ctx) => axios.post(url, body, { headers: ctx.headers, timeout: 15000 }).then((r) => r.data);
const put = (url, body, ctx) => axios.put(url, body, { headers: ctx.headers, timeout: 15000 }).then((r) => r.data);
const del = (url, ctx) => axios.delete(url, { headers: ctx.headers, timeout: 15000 }).then((r) => r.data);

const needOrg = (config, ctx, op) => (ctx.org ? null : skip(op, "'organization' slug required"));
const needIssue = (config, op) => (config.issueId ? null : skip(op, "'issueId' required"));

/* ------------------------------ ISSUES -------------------------- */

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

/* ----------------------------- PROJECTS ------------------------- */

async function opListProjects(config, ctx) {
  const e = needOrg(config, ctx, "listProjects"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/projects/`, ctx);
  return { projects: data, count: data.length };
}

async function opGetProject(config, ctx) {
  const e = needOrg(config, ctx, "getProject"); if (e) return e;
  if (!config.project) return skip("getProject", "'project' slug required");
  return get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/`, ctx);
}

async function opCreateProject(config, ctx) {
  const e = needOrg(config, ctx, "createProject"); if (e) return e;
  if (!config.team) return skip("createProject", "'team' slug required");
  const data = await post(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/projects/`, { name: config.name || "New Project", platform: config.platform || "javascript" }, ctx);
  return { id: data.id, slug: data.slug, name: data.name, platform: data.platform };
}

async function opUpdateProject(config, ctx) {
  const e = needOrg(config, ctx, "updateProject"); if (e) return e;
  if (!config.project) return skip("updateProject", "'project' slug required");
  const body = {};
  if (config.name) body.name = config.name;
  if (config.platform) body.platform = config.platform;
  if (config.newSlug) body.slug = config.newSlug;
  const data = await put(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/`, body, ctx);
  return { id: data.id, slug: data.slug, name: data.name, updated: true };
}

async function opListProjectKeys(config, ctx) {
  const e = needOrg(config, ctx, "listProjectKeys"); if (e) return e;
  if (!config.project) return skip("listProjectKeys", "'project' slug required");
  const data = await get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/keys/`, ctx);
  return { keys: data.map((k) => ({ id: k.id, name: k.name, dsn: k.dsn?.public, isActive: k.isActive })), count: data.length };
}

async function opListProjectIssues(config, ctx) {
  const e = needOrg(config, ctx, "listProjectIssues"); if (e) return e;
  if (!config.project) return skip("listProjectIssues", "'project' slug required");
  const data = await get(`${BASE}/projects/${enc(ctx.org)}/${enc(config.project)}/issues/?limit=${LIMIT(config)}&query=${enc(config.query || "is:unresolved")}`, ctx);
  return { issues: data, count: data.length };
}

/* ----------------------------- RELEASES ------------------------- */

async function opListReleases(config, ctx) {
  const e = needOrg(config, ctx, "listReleases"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/releases/?per_page=${LIMIT(config)}`, ctx);
  return { releases: data.map((r) => ({ version: r.version, dateCreated: r.dateCreated, url: r.url })), count: data.length };
}

async function opGetRelease(config, ctx) {
  const e = needOrg(config, ctx, "getRelease"); if (e) return e;
  if (!config.version) return skip("getRelease", "'version' required");
  return get(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/`, ctx);
}

async function opCreateRelease(config, ctx) {
  const e = needOrg(config, ctx, "createRelease"); if (e) return e;
  if (!config.version) return skip("createRelease", "'version' required");
  const body = { version: config.version };
  if (config.ref) body.ref = config.ref;
  if (config.url) body.url = config.url;
  if (config.projects) body.projects = csv(config.projects);
  const data = await post(`${BASE}/organizations/${enc(ctx.org)}/releases/`, body, ctx);
  return { version: data.version, url: data.url, dateCreated: data.dateCreated, projects: data.projects };
}

async function opFinalizeRelease(config, ctx) {
  const e = needOrg(config, ctx, "finalizeRelease"); if (e) return e;
  if (!config.version) return skip("finalizeRelease", "'version' required");
  const data = await put(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/`, { dateReleased: new Date().toISOString() }, ctx);
  return { version: data.version, dateReleased: data.dateReleased, finalized: true };
}

async function opCreateDeploy(config, ctx) {
  const e = needOrg(config, ctx, "createDeploy"); if (e) return e;
  if (!config.version || !config.environment) return skip("createDeploy", "'version' and 'environment' required");
  const body = { environment: config.environment };
  if (config.deployName) body.name = config.deployName;
  if (config.deployUrl) body.url = config.deployUrl;
  const data = await post(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/deploys/`, body, ctx);
  return { id: data.id, environment: data.environment, dateStarted: data.dateStarted, created: true };
}

async function opListDeploys(config, ctx) {
  const e = needOrg(config, ctx, "listDeploys"); if (e) return e;
  if (!config.version) return skip("listDeploys", "'version' required");
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/deploys/`, ctx);
  return { deploys: data, count: data.length };
}

/* ------------------------------ TEAMS --------------------------- */

async function opListTeams(config, ctx) {
  const e = needOrg(config, ctx, "listTeams"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/teams/`, ctx);
  return { teams: data.map((t) => ({ id: t.id, slug: t.slug, name: t.name, memberCount: t.memberCount })), count: data.length };
}

async function opListTeamProjects(config, ctx) {
  const e = needOrg(config, ctx, "listTeamProjects"); if (e) return e;
  if (!config.team) return skip("listTeamProjects", "'team' slug required");
  const data = await get(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/projects/`, ctx);
  return { projects: data, count: data.length };
}

async function opListTeamMembers(config, ctx) {
  const e = needOrg(config, ctx, "listTeamMembers"); if (e) return e;
  if (!config.team) return skip("listTeamMembers", "'team' slug required");
  const data = await get(`${BASE}/teams/${enc(ctx.org)}/${enc(config.team)}/members/`, ctx);
  return { members: data, count: data.length };
}

/* ------------------------------- ORG ---------------------------- */

async function opListOrganizations(config, ctx) {
  const data = await get(`${BASE}/organizations/`, ctx);
  return { organizations: data, count: data.length };
}

async function opGetOrganization(config, ctx) {
  const e = needOrg(config, ctx, "getOrganization"); if (e) return e;
  return get(`${BASE}/organizations/${enc(ctx.org)}/`, ctx);
}

async function opListOrgMembers(config, ctx) {
  const e = needOrg(config, ctx, "listOrgMembers"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/members/`, ctx);
  return { members: data.map((m) => ({ id: m.id, email: m.email, name: m.name, role: m.role })), count: data.length };
}

/* ---------------------------- MONITORING ------------------------ */

async function opCaptureEvent(config, ctx) {
  if (!config.dsn) return skip("captureEvent", "'dsn' required");
  const m = String(config.dsn).match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
  if (!m) return skip("captureEvent", "invalid DSN format");
  const [, key, host, projectId] = m;
  if (!/^[\w.-]+$/.test(host)) return skip("captureEvent", "invalid DSN host");
  const data = await axios
    .post(
      `https://${host}/api/${projectId}/store/`,
      { message: config.message || "BlinkBox event", level: config.level || "error", tags: config.tags || {} },
      { headers: { "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${key}` }, timeout: 10000 }
    )
    .then((r) => r.data);
  return { id: data.id, success: true };
}

const OPERATIONS = {
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
  listProjects: opListProjects,
  getProject: opGetProject,
  createProject: opCreateProject,
  updateProject: opUpdateProject,
  listProjectKeys: opListProjectKeys,
  listProjectIssues: opListProjectIssues,
  listReleases: opListReleases,
  getRelease: opGetRelease,
  createRelease: opCreateRelease,
  finalizeRelease: opFinalizeRelease,
  createDeploy: opCreateDeploy,
  listDeploys: opListDeploys,
  listTeams: opListTeams,
  listTeamProjects: opListTeamProjects,
  listTeamMembers: opListTeamMembers,
  listOrganizations: opListOrganizations,
  getOrganization: opGetOrganization,
  listOrgMembers: opListOrgMembers,
  captureEvent: opCaptureEvent,
};

function handleError(err) {
  if (err.message?.startsWith("Sentry")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
  if (status === 401 || status === 403) throw new Error(`Sentry: Auth failed (${status}) — check your API token and org slug.`);
  if (status === 404) throw new Error("Sentry: Not found — check organization/issue/project ID.");
  if (status === 429) throw new Error("Sentry: Rate limit exceeded. Add a Delay node.");
  throw new Error(`Sentry: ${status || "Error"} — ${msg}`);
}

export default {
  async run(config, input = {}, context = {}) {
    const operation = config.operation || "listIssues";
    const org = config.organization || config.org || input.organization || "";

    const handler = OPERATIONS[operation];
    if (!handler) return skip(operation, "unknown operation");
    if (!config.credentialId) return { success: false, error: "Sentry: auth token required.", skipped: true };

    let token;
    try {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Sentry");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    } catch (err) {
      return { success: false, error: `Sentry: Failed to resolve credential — ${err.message}`, skipped: true };
    }
    if (!token) return { success: false, error: "Sentry: auth token required.", skipped: true };

    const ctx = { org, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };

    try {
      return await handler(config, ctx, context);
    } catch (err) {
      handleError(err);
    }
  },
};

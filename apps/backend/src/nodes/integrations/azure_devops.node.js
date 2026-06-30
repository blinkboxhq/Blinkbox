/**
 * AZURE DEVOPS NODE
 * Manage work items, pull requests, repos, pipelines, builds and boards
 * across an Azure DevOps organization via the REST API (api-version 7.1).
 *
 * Auth: Personal Access Token (PAT). Sent as HTTP Basic with an empty
 * username (":PAT" base64-encoded), per Azure DevOps convention.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "7.1";

async function getPat(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Azure DevOps");
}

const enc = encodeURIComponent;
const csv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = (config, def = 50) => Math.min(Number(config.wiqlLimit || config.limit || def), 200);

function ctxFor(config, pat) {
  const org = config.organization;
  const ORG = `https://dev.azure.com/${enc(org)}`;
  const project = config.project ? enc(config.project) : null;
  const PROJ = project ? `${ORG}/${project}` : ORG;
  const headers = {
    Authorization: "Basic " + Buffer.from(":" + pat).toString("base64"),
    "Content-Type": "application/json",
  };
  return { org, ORG, PROJ, headers };
}

const get = (url, ctx) => axios.get(url, { headers: ctx.headers, timeout: 20000 }).then((r) => r.data);
const post = (url, body, ctx, ct) =>
  axios.post(url, body, { headers: { ...ctx.headers, ...(ct ? { "Content-Type": ct } : {}) }, timeout: 20000 }).then((r) => r.data);
const patch = (url, body, ctx, ct) =>
  axios.patch(url, body, { headers: { ...ctx.headers, ...(ct ? { "Content-Type": ct } : {}) }, timeout: 20000 }).then((r) => r.data);
const del = (url, ctx) => axios.delete(url, { headers: ctx.headers, timeout: 20000 }).then((r) => r.data);

function jsonPatch(ops) {
  return ops.filter((o) => o.value !== undefined && o.value !== "");
}

/* --------------------------- WORK ITEMS ------------------------- */

async function opCreateWorkItem(config, ctx) {
  if (!config.project || !config.title) return skip("createWorkItem", "'project' and 'title' are required");
  const type = config.workItemType || "Task";
  const ops = jsonPatch([
    { op: "add", path: "/fields/System.Title", value: config.title },
    { op: "add", path: "/fields/System.Description", value: config.description },
    { op: "add", path: "/fields/System.AssignedTo", value: config.assignedTo },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: config.priority ? Number(config.priority) : undefined },
    { op: "add", path: "/fields/System.Tags", value: config.tags },
  ]);
  const url = `${ctx.PROJ}/_apis/wit/workitems/$${enc(type)}?api-version=${API}`;
  const data = await patch(url, ops, ctx, "application/json-patch+json");
  return { id: data.id, url: data._links?.html?.href, type, title: config.title, created: true };
}

async function opGetWorkItem(config, ctx) {
  if (!config.workItemId) return skip("getWorkItem", "'workItemId' is required");
  const data = await get(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?$expand=all&api-version=${API}`, ctx);
  return { id: data.id, fields: data.fields, url: data._links?.html?.href };
}

async function opUpdateWorkItem(config, ctx) {
  if (!config.workItemId) return skip("updateWorkItem", "'workItemId' is required");
  const ops = jsonPatch([
    { op: "add", path: "/fields/System.Title", value: config.updateTitle || config.title },
    { op: "add", path: "/fields/System.State", value: config.state },
    { op: "add", path: "/fields/System.AssignedTo", value: config.assignedTo },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: config.priority ? Number(config.priority) : undefined },
    { op: "add", path: "/fields/System.Description", value: config.description },
  ]);
  if (!ops.length) return skip("updateWorkItem", "no fields to update");
  const data = await patch(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?api-version=${API}`, ops, ctx, "application/json-patch+json");
  return { id: data.id, fields: data.fields, updated: true };
}

async function opDeleteWorkItem(config, ctx) {
  if (!config.workItemId) return skip("deleteWorkItem", "'workItemId' is required");
  await del(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?api-version=${API}`, ctx);
  return { id: config.workItemId, deleted: true };
}

async function opListWorkItems(config, ctx) {
  if (!config.project) return skip("listWorkItems", "'project' is required");
  const wiql = config.wiql || "SELECT [Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.CreatedDate] DESC";
  const res = await post(`${ctx.PROJ}/_apis/wit/wiql?api-version=${API}&$top=${LIMIT(config)}`, { query: wiql }, ctx);
  const ids = (res.workItems || []).map((w) => w.id).slice(0, LIMIT(config));
  if (!ids.length) return { workItems: [], count: 0 };
  const detail = await get(`${ctx.ORG}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo&api-version=${API}`, ctx);
  return { workItems: (detail.value || []).map((w) => ({ id: w.id, ...w.fields })), count: detail.count };
}

async function opAddWorkItemComment(config, ctx) {
  if (!config.workItemId || !config.text || !config.project) return skip("addWorkItemComment", "'project', 'workItemId' and 'text' are required");
  const data = await post(`${ctx.PROJ}/_apis/wit/workItems/${enc(config.workItemId)}/comments?api-version=${API}-preview.4`, { text: config.text }, ctx);
  return { id: data.id, text: data.text, created: true };
}

async function opListWorkItemComments(config, ctx) {
  if (!config.workItemId || !config.project) return skip("listWorkItemComments", "'project' and 'workItemId' are required");
  const data = await get(`${ctx.PROJ}/_apis/wit/workItems/${enc(config.workItemId)}/comments?api-version=${API}-preview.4`, ctx);
  return { comments: (data.comments || []).map((c) => ({ id: c.id, text: c.text, author: c.createdBy?.displayName, createdAt: c.createdDate })), count: data.totalCount };
}

async function opListWorkItemTypes(config, ctx) {
  if (!config.project) return skip("listWorkItemTypes", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/wit/workitemtypes?api-version=${API}`, ctx);
  return { types: (data.value || []).map((t) => ({ name: t.name, referenceName: t.referenceName, color: t.color })) };
}

/* --------------------------- PULL REQUESTS ---------------------- */

async function opCreatePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.sourceRefName) return skip("createPR", "'project', 'repositoryId' and 'sourceRefName' are required");
  const body = {
    sourceRefName: config.sourceRefName,
    targetRefName: config.targetRefName || "refs/heads/main",
    title: config.prTitle || config.title,
    description: config.prDescription || config.description,
  };
  if (config.reviewers) body.reviewers = csv(config.reviewers).map((id) => ({ id }));
  const data = await post(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, url: data._links?.web?.href, created: true };
}

async function opGetPR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("getPR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, ctx);
  return { id: data.pullRequestId, title: data.title, status: data.status, sourceRefName: data.sourceRefName, targetRefName: data.targetRefName, url: data._links?.web?.href };
}

async function opListPRs(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listPRs", "'project' and 'repositoryId' are required");
  const status = config.prStatus ? `&searchCriteria.status=${enc(config.prStatus)}` : "";
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests?$top=${LIMIT(config)}${status}&api-version=${API}`, ctx);
  return { pullRequests: (data.value || []).map((p) => ({ id: p.pullRequestId, title: p.title, status: p.status, createdBy: p.createdBy?.displayName })), count: data.count };
}

async function opUpdatePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("updatePR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const body = {};
  if (config.prTitle) body.title = config.prTitle;
  if (config.prDescription) body.description = config.prDescription;
  if (config.prStatus) body.status = config.prStatus;
  const data = await patch(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, updated: true };
}

async function opCompletePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("completePR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const pr = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, ctx);
  const body = {
    status: "completed",
    lastMergeSourceCommit: pr.lastMergeSourceCommit,
    completionOptions: { mergeStrategy: config.mergeStrategy || "squash", deleteSourceBranch: !!config.deleteSourceBranch },
  };
  const data = await patch(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, completed: true };
}

async function opAddPRReviewer(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId || !config.reviewerId) return skip("addPRReviewer", "'project', 'repositoryId', 'pullRequestId' and 'reviewerId' are required");
  const data = await axios
    .put(
      `${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}/reviewers/${enc(config.reviewerId)}?api-version=${API}`,
      { vote: 0 },
      { headers: ctx.headers, timeout: 20000 }
    )
    .then((r) => r.data);
  return { reviewerId: data.id, added: true };
}

/* ------------------------------ REPOS --------------------------- */

async function opListRepos(config, ctx) {
  if (!config.project) return skip("listRepos", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories?api-version=${API}`, ctx);
  return { repositories: (data.value || []).map((r) => ({ id: r.id, name: r.name, defaultBranch: r.defaultBranch, url: r.webUrl })), count: data.count };
}

async function opGetRepo(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("getRepo", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, defaultBranch: data.defaultBranch, size: data.size, url: data.webUrl };
}

async function opListBranches(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listBranches", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/refs?filter=heads/&api-version=${API}`, ctx);
  return { branches: (data.value || []).map((b) => ({ name: b.name.replace("refs/heads/", ""), objectId: b.objectId })), count: data.count };
}

async function opListCommits(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listCommits", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/commits?searchCriteria.$top=${LIMIT(config, 30)}&api-version=${API}`, ctx);
  return { commits: (data.value || []).map((c) => ({ id: c.commitId, comment: c.comment, author: c.author?.name, date: c.author?.date })), count: data.count };
}

/* ---------------------------- PIPELINES ------------------------- */

async function opListPipelines(config, ctx) {
  if (!config.project) return skip("listPipelines", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines?api-version=${API}`, ctx);
  return { pipelines: (data.value || []).map((p) => ({ id: p.id, name: p.name, folder: p.folder })), count: data.count };
}

async function opGetPipeline(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("getPipeline", "'project' and 'pipelineId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, folder: data.folder, url: data._links?.web?.href };
}

async function opRunPipeline(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("runPipeline", "'project' and 'pipelineId' are required");
  const body = {};
  if (config.branch) body.resources = { repositories: { self: { refName: `refs/heads/${config.branch}` } } };
  const data = await post(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs?api-version=${API}`, body, ctx);
  return { id: data.id, state: data.state, url: data._links?.web?.href, started: true };
}

async function opListPipelineRuns(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("listPipelineRuns", "'project' and 'pipelineId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs?api-version=${API}`, ctx);
  return { runs: (data.value || []).map((r) => ({ id: r.id, state: r.state, result: r.result, createdDate: r.createdDate })), count: data.count };
}

async function opGetPipelineRun(config, ctx) {
  if (!config.project || !config.pipelineId || !config.runId) return skip("getPipelineRun", "'project', 'pipelineId' and 'runId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs/${enc(config.runId)}?api-version=${API}`, ctx);
  return { id: data.id, state: data.state, result: data.result, url: data._links?.web?.href };
}

/* ------------------------------ BUILDS -------------------------- */

async function opListBuilds(config, ctx) {
  if (!config.project) return skip("listBuilds", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/build/builds?$top=${LIMIT(config, 30)}&api-version=${API}`, ctx);
  return { builds: (data.value || []).map((b) => ({ id: b.id, buildNumber: b.buildNumber, status: b.status, result: b.result, definition: b.definition?.name })), count: data.count };
}

async function opGetBuild(config, ctx) {
  if (!config.project || !config.buildId) return skip("getBuild", "'project' and 'buildId' are required");
  const data = await get(`${ctx.PROJ}/_apis/build/builds/${enc(config.buildId)}?api-version=${API}`, ctx);
  return { id: data.id, buildNumber: data.buildNumber, status: data.status, result: data.result, url: data._links?.web?.href };
}

async function opQueueBuild(config, ctx) {
  if (!config.project || !config.definitionId) return skip("queueBuild", "'project' and 'definitionId' are required");
  const body = { definition: { id: Number(config.definitionId) } };
  if (config.branch) body.sourceBranch = `refs/heads/${config.branch}`;
  const data = await post(`${ctx.PROJ}/_apis/build/builds?api-version=${API}`, body, ctx);
  return { id: data.id, buildNumber: data.buildNumber, status: data.status, queued: true };
}

/* ----------------------- PROJECTS & BOARDS ---------------------- */

async function opListProjects(config, ctx) {
  const data = await get(`${ctx.ORG}/_apis/projects?$top=${LIMIT(config)}&api-version=${API}`, ctx);
  return { projects: (data.value || []).map((p) => ({ id: p.id, name: p.name, state: p.state, visibility: p.visibility })), count: data.count };
}

async function opGetProject(config, ctx) {
  if (!config.project) return skip("getProject", "'project' is required");
  const data = await get(`${ctx.ORG}/_apis/projects/${enc(config.project)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, description: data.description, state: data.state, url: data.url };
}

async function opListTeams(config, ctx) {
  if (!config.project) return skip("listTeams", "'project' is required");
  const data = await get(`${ctx.ORG}/_apis/projects/${enc(config.project)}/teams?api-version=${API}`, ctx);
  return { teams: (data.value || []).map((t) => ({ id: t.id, name: t.name })), count: data.count };
}

async function opListIterations(config, ctx) {
  if (!config.project || !config.team) return skip("listIterations", "'project' and 'team' are required");
  const data = await get(`${ctx.ORG}/${enc(config.project)}/${enc(config.team)}/_apis/work/teamsettings/iterations?api-version=${API}`, ctx);
  return { iterations: (data.value || []).map((i) => ({ id: i.id, name: i.name, path: i.path, ...i.attributes })), count: data.count };
}

async function opListAreas(config, ctx) {
  if (!config.project) return skip("listAreas", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/wit/classificationnodes/areas?$depth=2&api-version=${API}`, ctx);
  return { areas: data };
}

function skip(op, msg) {
  return { success: false, error: `Azure DevOps ${op}: ${msg}.`, skipped: true };
}

const OPERATIONS = {
  createWorkItem: opCreateWorkItem,
  getWorkItem: opGetWorkItem,
  updateWorkItem: opUpdateWorkItem,
  deleteWorkItem: opDeleteWorkItem,
  listWorkItems: opListWorkItems,
  addWorkItemComment: opAddWorkItemComment,
  listWorkItemComments: opListWorkItemComments,
  listWorkItemTypes: opListWorkItemTypes,
  createPR: opCreatePR,
  getPR: opGetPR,
  listPRs: opListPRs,
  updatePR: opUpdatePR,
  completePR: opCompletePR,
  addPRReviewer: opAddPRReviewer,
  listRepos: opListRepos,
  getRepo: opGetRepo,
  listBranches: opListBranches,
  listCommits: opListCommits,
  listPipelines: opListPipelines,
  getPipeline: opGetPipeline,
  runPipeline: opRunPipeline,
  listPipelineRuns: opListPipelineRuns,
  getPipelineRun: opGetPipelineRun,
  listBuilds: opListBuilds,
  getBuild: opGetBuild,
  queueBuild: opQueueBuild,
  listProjects: opListProjects,
  getProject: opGetProject,
  listTeams: opListTeams,
  listIterations: opListIterations,
  listAreas: opListAreas,
};

function handleError(err) {
  if (err.message?.startsWith("Azure DevOps")) throw err;
  const status = err.response?.status;
  const apiMsg = err.response?.data?.message;
  if (status === 401) throw new Error("Azure DevOps: Invalid or expired Personal Access Token.");
  if (status === 403) throw new Error("Azure DevOps: PAT lacks required scope for this operation.");
  if (status === 404) throw new Error(`Azure DevOps: Not found — ${apiMsg || "check organization/project/id."}`);
  if (status === 400) throw new Error(`Azure DevOps: ${apiMsg || "Bad request."}`);
  if (status === 429) throw new Error("Azure DevOps: Rate limit exceeded. Slow down requests.");
  throw new Error(`Azure DevOps: ${apiMsg || err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createWorkItem" } = config;

    const handler = OPERATIONS[operation];
    if (!handler) return skip(operation, "unknown operation");
    if (!config.organization) return skip(operation, "'organization' is required");
    if (!config.credentialId) return { success: false, error: "Azure DevOps: credential required.", skipped: true };

    let pat;
    try {
      pat = await getPat(config.credentialId, context.workspaceId);
    } catch (err) {
      return { success: false, error: `Azure DevOps: Failed to resolve credential — ${err.message}`, skipped: true };
    }

    const ctx = ctxFor(config, pat);

    try {
      return await handler(config, ctx, context);
    } catch (err) {
      handleError(err);
    }
  },
};

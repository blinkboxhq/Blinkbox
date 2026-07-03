/**
 * GITLAB — Merge Request resource. createMR/mergeMR preserved verbatim from the
 * monolith; listMRs, getMR, updateMR, commentMR, closeMR, approveMR added for
 * parity. Handlers receive (config, client).
 */
import { requireProject, clampLimit } from "../GenericFunctions.js";

function mrOut(m) {
  return { id: m.id, iid: m.iid, title: m.title, state: m.state, web_url: m.web_url, source_branch: m.source_branch, target_branch: m.target_branch };
}

async function opListMRs(config, client) {
  const api = requireProject(client);
  const res = await client.get(`${api}/merge_requests`, { state: config.state || "opened", per_page: clampLimit(config.limit) });
  return { items: res.data.map(mrOut), count: res.data.length };
}

async function opGetMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab getMR: 'mrIid' is required.", skipped: true };
  const res = await client.get(`${api}/merge_requests/${config.mrIid}`);
  const m = res.data;
  return { ...mrOut(m), description: m.description, merge_status: m.merge_status, author: m.author?.username, created_at: m.created_at };
}

async function opCreateMR(config, client) {
  const api = requireProject(client);
  if (!config.title || !config.sourceBranch) return { success: false, error: "gitlab createMR: 'title' and 'sourceBranch' are required.", skipped: true };
  const res = await client.post(`${api}/merge_requests`, { title: config.title, source_branch: config.sourceBranch, target_branch: config.targetBranch || "main", description: config.description });
  return mrOut(res.data);
}

async function opUpdateMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab updateMR: 'mrIid' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = config.title;
  if (config.description) body.description = config.description;
  if (config.targetBranch) body.target_branch = config.targetBranch;
  if (config.labels) body.labels = config.labels;
  if (config.state_event) body.state_event = config.state_event;
  const res = await client.put(`${api}/merge_requests/${config.mrIid}`, body);
  return mrOut(res.data);
}

async function opMergeMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab mergeMR: 'mrIid' is required.", skipped: true };
  const res = await client.put(`${api}/merge_requests/${config.mrIid}/merge`, {});
  return { id: res.data.id, iid: res.data.iid, state: res.data.state, merged_at: res.data.merged_at, web_url: res.data.web_url };
}

async function opCloseMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab closeMR: 'mrIid' is required.", skipped: true };
  const res = await client.put(`${api}/merge_requests/${config.mrIid}`, { state_event: "close" });
  return mrOut(res.data);
}

async function opCommentMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab commentMR: 'mrIid' is required.", skipped: true };
  if (!config.body) return { success: false, error: "gitlab commentMR: 'body' is required.", skipped: true };
  const res = await client.post(`${api}/merge_requests/${config.mrIid}/notes`, { body: config.body });
  return { id: res.data.id, body: res.data.body, author: res.data.author?.username, created_at: res.data.created_at };
}

async function opApproveMR(config, client) {
  const api = requireProject(client);
  if (!config.mrIid) return { success: false, error: "gitlab approveMR: 'mrIid' is required.", skipped: true };
  const res = await client.post(`${api}/merge_requests/${config.mrIid}/approve`, {});
  return { id: res.data.id, iid: res.data.iid, approved: true, approvals_left: res.data.approvals_left };
}

export const mergeRequestOperations = {
  listMRs: opListMRs,
  getMR: opGetMR,
  createMR: opCreateMR,
  updateMR: opUpdateMR,
  mergeMR: opMergeMR,
  closeMR: opCloseMR,
  commentMR: opCommentMR,
  approveMR: opApproveMR,
};

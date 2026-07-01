/**
 * GitHub — releases & Actions workflows. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers, repoPath, PER_PAGE } from "../GenericFunctions.js";

async function opCreateRelease(config, token) {
  if (!config.tagName) return { success: false, error: "GitHub createRelease: 'tagName' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/releases`, {
    tag_name: config.tagName, name: config.name || config.tagName, body: config.body || undefined,
    draft: config.draft || false, prerelease: config.prerelease || false, target_commitish: config.targetCommitish || undefined,
  }, { headers: headers(token), timeout: 15000 });
  return { id: res.data.id, url: res.data.html_url, tagName: res.data.tag_name, name: res.data.name };
}

async function opListReleases(config, token) {
  const res = await axios.get(`${repoPath(config)}/releases`, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config) } });
  return { releases: res.data.map((r) => ({ id: r.id, tagName: r.tag_name, name: r.name, draft: r.draft, prerelease: r.prerelease, url: r.html_url })), count: res.data.length };
}

async function opGetLatestRelease(config, token) {
  const res = await axios.get(`${repoPath(config)}/releases/latest`, { headers: headers(token), timeout: 15000 });
  return { id: res.data.id, tagName: res.data.tag_name, name: res.data.name, body: res.data.body, url: res.data.html_url };
}

async function opListWorkflowRuns(config, token) {
  const url = config.workflowId
    ? `${repoPath(config)}/actions/workflows/${encodeURIComponent(config.workflowId)}/runs`
    : `${repoPath(config)}/actions/runs`;
  const res = await axios.get(url, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config), branch: config.branch || undefined, status: config.runStatus || undefined } });
  return { runs: res.data.workflow_runs?.map((r) => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, branch: r.head_branch, url: r.html_url })) ?? [], count: res.data.total_count };
}

async function opDispatchWorkflow(config, token) {
  if (!config.workflowId) return { success: false, error: "GitHub dispatchWorkflow: 'workflowId' (file name or id) is required.", skipped: true };
  let inputs;
  if (config.workflowInputs) {
    try { inputs = typeof config.workflowInputs === "object" ? config.workflowInputs : JSON.parse(config.workflowInputs); }
    catch { return { success: false, error: "GitHub dispatchWorkflow: 'workflowInputs' must be valid JSON.", skipped: true }; }
  }
  await axios.post(`${repoPath(config)}/actions/workflows/${encodeURIComponent(config.workflowId)}/dispatches`, { ref: config.branch || "main", inputs }, { headers: headers(token), timeout: 15000 });
  return { dispatched: true, workflowId: config.workflowId, ref: config.branch || "main" };
}

export const actionsOperations = {
  createRelease: opCreateRelease,
  listReleases: opListReleases,
  getLatestRelease: opGetLatestRelease,
  listWorkflowRuns: opListWorkflowRuns,
  dispatchWorkflow: opDispatchWorkflow,
};

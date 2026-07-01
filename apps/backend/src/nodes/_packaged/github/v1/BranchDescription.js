/**
 * GitHub — branches & commits. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers, repoPath, PER_PAGE } from "../GenericFunctions.js";

async function opListBranches(config, token) {
  const res = await axios.get(`${repoPath(config)}/branches`, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config, 100) } });
  return { branches: res.data.map((b) => ({ name: b.name, sha: b.commit?.sha, protected: b.protected })), count: res.data.length };
}

async function opGetBranch(config, token) {
  if (!config.branch) return { success: false, error: "GitHub getBranch: 'branch' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/branches/${encodeURIComponent(config.branch)}`, { headers: headers(token), timeout: 15000 });
  return { name: res.data.name, sha: res.data.commit?.sha, protected: res.data.protected };
}

async function opCreateBranch(config, token) {
  if (!config.branch) return { success: false, error: "GitHub createBranch: 'branch' (new branch name) is required.", skipped: true };
  const fromRef = config.fromBranch || "main";
  const baseRef = await axios.get(`${repoPath(config)}/git/ref/heads/${encodeURIComponent(fromRef)}`, { headers: headers(token), timeout: 15000 });
  const res = await axios.post(`${repoPath(config)}/git/refs`, { ref: `refs/heads/${config.branch}`, sha: baseRef.data.object.sha }, { headers: headers(token), timeout: 15000 });
  return { branch: config.branch, ref: res.data.ref, sha: res.data.object?.sha, created: true };
}

async function opListCommits(config, token) {
  const res = await axios.get(`${repoPath(config)}/commits`, {
    headers: headers(token), timeout: 15000,
    params: { sha: config.branch || undefined, path: config.path || undefined, author: config.author || undefined, per_page: PER_PAGE(config) },
  });
  return { commits: res.data.map((c) => ({ sha: c.sha, message: c.commit?.message, author: c.commit?.author?.name, date: c.commit?.author?.date, url: c.html_url })), count: res.data.length };
}

async function opGetCommit(config, token) {
  if (!config.sha) return { success: false, error: "GitHub getCommit: 'sha' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/commits/${encodeURIComponent(config.sha)}`, { headers: headers(token), timeout: 15000 });
  return { sha: res.data.sha, message: res.data.commit?.message, author: res.data.commit?.author?.name, additions: res.data.stats?.additions, deletions: res.data.stats?.deletions, files: res.data.files?.map((f) => f.filename), url: res.data.html_url };
}

export const branchOperations = {
  listBranches: opListBranches,
  getBranch: opGetBranch,
  createBranch: opCreateBranch,
  listCommits: opListCommits,
  getCommit: opGetCommit,
};

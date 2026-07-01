/**
 * GitHub — pull requests, reviews & reviewers. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers, repoPath, csv, PER_PAGE } from "../GenericFunctions.js";

async function opCreatePR(config, token) {
  if (!config.title || !config.head) return { success: false, error: "GitHub createPR: 'title' and 'head' branch are required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/pulls`, {
    title: config.title, body: config.body || undefined, head: config.head, base: config.base || "main", draft: config.draft || undefined,
  }, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
}

async function opGetPR(config, token) {
  if (!config.prNumber) return { success: false, error: "GitHub getPR: 'prNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}`, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, title: res.data.title, body: res.data.body, state: res.data.state, url: res.data.html_url, merged: res.data.merged, mergeable: res.data.mergeable, head: res.data.head?.ref, base: res.data.base?.ref, additions: res.data.additions, deletions: res.data.deletions, changedFiles: res.data.changed_files };
}

async function opListPRs(config, token) {
  const res = await axios.get(`${repoPath(config)}/pulls`, {
    headers: headers(token), timeout: 15000,
    params: { state: config.state || "open", per_page: PER_PAGE(config), base: config.base || undefined, head: config.head || undefined },
  });
  return { pullRequests: res.data.map((p) => ({ number: p.number, title: p.title, state: p.state, url: p.html_url, author: p.user?.login, head: p.head?.ref, base: p.base?.ref, draft: p.draft })), count: res.data.length };
}

async function opUpdatePR(config, token) {
  if (!config.prNumber) return { success: false, error: "GitHub updatePR: 'prNumber' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = config.title;
  if (config.body != null) body.body = config.body;
  if (config.state) body.state = config.state;
  if (config.base) body.base = config.base;
  const res = await axios.patch(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}`, body, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, state: res.data.state, url: res.data.html_url, updated: true };
}

async function opMergePR(config, token) {
  if (!config.prNumber) return { success: false, error: "GitHub mergePR: 'prNumber' is required.", skipped: true };
  const res = await axios.put(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}/merge`, {
    commit_title: config.commitTitle || undefined, commit_message: config.commitMessage || undefined, merge_method: config.mergeMethod || "merge",
  }, { headers: headers(token), timeout: 15000 });
  return { merged: res.data.merged, sha: res.data.sha, message: res.data.message };
}

async function opListPRFiles(config, token) {
  if (!config.prNumber) return { success: false, error: "GitHub listPRFiles: 'prNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}/files`, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config, 100) } });
  return { files: res.data.map((f) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions })), count: res.data.length };
}

async function opRequestReviewers(config, token) {
  if (!config.prNumber || !config.reviewers) return { success: false, error: "GitHub requestReviewers: 'prNumber' and 'reviewers' are required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}/requested_reviewers`, { reviewers: csv(config.reviewers), team_reviewers: csv(config.teamReviewers) }, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, requested: true };
}

async function opCreateReview(config, token) {
  if (!config.prNumber) return { success: false, error: "GitHub createReview: 'prNumber' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/pulls/${encodeURIComponent(config.prNumber)}/reviews`, {
    body: config.body || undefined, event: config.reviewEvent || "COMMENT",
  }, { headers: headers(token), timeout: 15000 });
  return { id: res.data.id, state: res.data.state, url: res.data.html_url };
}

export const pullRequestOperations = {
  createPR: opCreatePR,
  getPR: opGetPR,
  listPRs: opListPRs,
  updatePR: opUpdatePR,
  mergePR: opMergePR,
  listPRFiles: opListPRFiles,
  requestReviewers: opRequestReviewers,
  createReview: opCreateReview,
};

/**
 * GITHUB NODE
 * Interact with the GitHub REST API — issues, PRs, content, branches,
 * commits, releases, workflows, repos, search and users.
 *
 * Auth: Personal Access Token (PAT) or GitHub App token stored in vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.github.com";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "GitHub");
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

function repoPath(config) {
  return `${BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

function csv(v) {
  return v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

const PER_PAGE = (config, def = 30) => Math.min(Number(config.limit || def), 100);

const NO_REPO_OPS = new Set([
  "getAuthenticatedUser", "listMyRepos", "createRepo", "getUser", "listUserRepos",
  "searchIssues", "searchRepos", "searchCode", "listOrgRepos",
]);

/* ----------------------------- ISSUES --------------------------- */

async function opCreateIssue(config, token) {
  if (!config.title) return { success: false, error: "GitHub createIssue: 'title' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues`, {
    title: config.title, body: config.body || undefined,
    labels: csv(config.labels), assignees: csv(config.assignees), milestone: config.milestone ? Number(config.milestone) : undefined,
  }, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
}

async function opGetIssue(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub getIssue: 'issueNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, title: res.data.title, body: res.data.body, state: res.data.state, url: res.data.html_url, author: res.data.user?.login, labels: res.data.labels?.map((l) => l.name), assignees: res.data.assignees?.map((a) => a.login) };
}

async function opListIssues(config, token) {
  const res = await axios.get(`${repoPath(config)}/issues`, {
    headers: headers(token), timeout: 15000,
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
  const res = await axios.patch(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, body, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, state: res.data.state, url: res.data.html_url, updated: true };
}

async function opCloseIssue(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub closeIssue: 'issueNumber' is required.", skipped: true };
  const res = await axios.patch(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}`, { state: "closed", state_reason: config.stateReason || "completed" }, { headers: headers(token), timeout: 15000 });
  return { number: res.data.number, state: res.data.state, closed: true };
}

async function opAddLabels(config, token) {
  if (!config.issueNumber || !config.labels) return { success: false, error: "GitHub addLabels: 'issueNumber' and 'labels' are required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/labels`, { labels: csv(config.labels) }, { headers: headers(token), timeout: 15000 });
  return { labels: res.data.map((l) => l.name), count: res.data.length };
}

async function opCreateComment(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub createComment: 'issueNumber' is required.", skipped: true };
  if (!config.body) return { success: false, error: "GitHub createComment: 'body' is required.", skipped: true };
  const res = await axios.post(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/comments`, { body: config.body }, { headers: headers(token), timeout: 15000 });
  return { id: res.data.id, url: res.data.html_url, body: res.data.body };
}

async function opListComments(config, token) {
  if (!config.issueNumber) return { success: false, error: "GitHub listComments: 'issueNumber' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/issues/${encodeURIComponent(config.issueNumber)}/comments`, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config) } });
  return { comments: res.data.map((c) => ({ id: c.id, author: c.user?.login, body: c.body, url: c.html_url })), count: res.data.length };
}

/* ------------------------------ PRs ----------------------------- */

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

/* ---------------------------- CONTENT --------------------------- */

async function opCreateFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub createFile: 'path' is required.", skipped: true };
  if (config.content === undefined || config.content === null) return { success: false, error: "GitHub createFile: 'content' is required.", skipped: true };
  if (!config.commitMessage) return { success: false, error: "GitHub createFile: 'commitMessage' is required.", skipped: true };
  let sha;
  try {
    const existing = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 15000, params: config.branch ? { ref: config.branch } : undefined });
    sha = existing.data.sha;
  } catch (e) {
    if (e.response?.status !== 404) throw e;
  }
  const res = await axios.put(`${repoPath(config)}/contents/${config.path}`, {
    message: config.commitMessage,
    content: Buffer.from(String(config.content), "utf-8").toString("base64"),
    branch: config.branch || undefined, sha,
  }, { headers: headers(token), timeout: 15000 });
  return { path: res.data.content?.path, sha: res.data.content?.sha, url: res.data.content?.html_url, commitSha: res.data.commit?.sha, updated: Boolean(sha) };
}

async function opGetFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub getFile: 'path' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 15000, params: config.branch ? { ref: config.branch } : undefined });
  if (Array.isArray(res.data)) {
    return { isDirectory: true, entries: res.data.map((e) => ({ name: e.name, path: e.path, type: e.type, sha: e.sha })) };
  }
  const content = res.data.content ? Buffer.from(res.data.content, "base64").toString("utf-8") : undefined;
  return { path: res.data.path, sha: res.data.sha, size: res.data.size, content, url: res.data.html_url };
}

async function opDeleteFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub deleteFile: 'path' is required.", skipped: true };
  if (!config.commitMessage) return { success: false, error: "GitHub deleteFile: 'commitMessage' is required.", skipped: true };
  const existing = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 15000, params: config.branch ? { ref: config.branch } : undefined });
  const res = await axios.delete(`${repoPath(config)}/contents/${config.path}`, {
    headers: headers(token), timeout: 15000,
    data: { message: config.commitMessage, sha: existing.data.sha, branch: config.branch || undefined },
  });
  return { deleted: true, path: config.path, commitSha: res.data.commit?.sha };
}

/* ---------------------- BRANCHES & COMMITS ---------------------- */

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

/* ---------------------------- RELEASES -------------------------- */

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

/* ---------------------------- WORKFLOWS ------------------------- */

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

/* ----------------------- REPOS / USERS / SEARCH ----------------- */

async function opGetRepo(config, token) {
  const res = await axios.get(repoPath(config), { headers: headers(token), timeout: 15000 });
  return { name: res.data.name, fullName: res.data.full_name, description: res.data.description, private: res.data.private, stars: res.data.stargazers_count, forks: res.data.forks_count, openIssues: res.data.open_issues_count, url: res.data.html_url, defaultBranch: res.data.default_branch, language: res.data.language };
}

async function opListMyRepos(config, token) {
  const res = await axios.get(`${BASE}/user/repos`, { headers: headers(token), timeout: 15000, params: { per_page: PER_PAGE(config), sort: config.sort || "updated", visibility: config.visibility || "all", affiliation: config.affiliation || undefined } });
  return { repos: res.data.map((r) => ({ name: r.name, fullName: r.full_name, private: r.private, stars: r.stargazers_count, url: r.html_url })), count: res.data.length };
}

async function opCreateRepo(config, token) {
  if (!config.name) return { success: false, error: "GitHub createRepo: 'name' is required.", skipped: true };
  const url = config.org ? `${BASE}/orgs/${encodeURIComponent(config.org)}/repos` : `${BASE}/user/repos`;
  const res = await axios.post(url, {
    name: config.name, description: config.description || undefined, private: config.private || false,
    auto_init: config.autoInit || false, gitignore_template: config.gitignoreTemplate || undefined, license_template: config.licenseTemplate || undefined,
  }, { headers: headers(token), timeout: 15000 });
  return { name: res.data.name, fullName: res.data.full_name, url: res.data.html_url, created: true };
}

async function opGetUser(config, token) {
  if (!config.username) return { success: false, error: "GitHub getUser: 'username' is required.", skipped: true };
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(config.username)}`, { headers: headers(token), timeout: 15000 });
  return { login: res.data.login, name: res.data.name, bio: res.data.bio, company: res.data.company, followers: res.data.followers, following: res.data.following, publicRepos: res.data.public_repos, url: res.data.html_url };
}

async function opGetAuthenticatedUser(config, token) {
  const res = await axios.get(`${BASE}/user`, { headers: headers(token), timeout: 15000 });
  return { login: res.data.login, name: res.data.name, email: res.data.email, publicRepos: res.data.public_repos, privateRepos: res.data.total_private_repos, url: res.data.html_url };
}

async function opSearchIssues(config, token) {
  if (!config.query) return { success: false, error: "GitHub searchIssues: 'query' is required.", skipped: true };
  const res = await axios.get(`${BASE}/search/issues`, { headers: headers(token), timeout: 15000, params: { q: config.query, per_page: PER_PAGE(config), sort: config.sort || undefined } });
  return { items: res.data.items?.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, repo: i.repository_url?.split("/repos/")[1] })) ?? [], totalCount: res.data.total_count };
}

async function opSearchRepos(config, token) {
  if (!config.query) return { success: false, error: "GitHub searchRepos: 'query' is required.", skipped: true };
  const res = await axios.get(`${BASE}/search/repositories`, { headers: headers(token), timeout: 15000, params: { q: config.query, per_page: PER_PAGE(config), sort: config.sort || undefined } });
  return { items: res.data.items?.map((r) => ({ fullName: r.full_name, stars: r.stargazers_count, url: r.html_url, description: r.description })) ?? [], totalCount: res.data.total_count };
}

async function opSearchCode(config, token) {
  if (!config.query) return { success: false, error: "GitHub searchCode: 'query' is required.", skipped: true };
  const res = await axios.get(`${BASE}/search/code`, { headers: headers(token), timeout: 15000, params: { q: config.query, per_page: PER_PAGE(config) } });
  return { items: res.data.items?.map((c) => ({ name: c.name, path: c.path, repo: c.repository?.full_name, url: c.html_url })) ?? [], totalCount: res.data.total_count };
}

const OPERATIONS = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  listIssues: opListIssues,
  updateIssue: opUpdateIssue,
  closeIssue: opCloseIssue,
  addLabels: opAddLabels,
  createComment: opCreateComment,
  listComments: opListComments,
  createPR: opCreatePR,
  getPR: opGetPR,
  listPRs: opListPRs,
  updatePR: opUpdatePR,
  mergePR: opMergePR,
  listPRFiles: opListPRFiles,
  requestReviewers: opRequestReviewers,
  createReview: opCreateReview,
  createFile: opCreateFile,
  getFile: opGetFile,
  deleteFile: opDeleteFile,
  listBranches: opListBranches,
  getBranch: opGetBranch,
  createBranch: opCreateBranch,
  listCommits: opListCommits,
  getCommit: opGetCommit,
  createRelease: opCreateRelease,
  listReleases: opListReleases,
  getLatestRelease: opGetLatestRelease,
  listWorkflowRuns: opListWorkflowRuns,
  dispatchWorkflow: opDispatchWorkflow,
  getRepo: opGetRepo,
  listMyRepos: opListMyRepos,
  createRepo: opCreateRepo,
  getUser: opGetUser,
  getAuthenticatedUser: opGetAuthenticatedUser,
  searchIssues: opSearchIssues,
  searchRepos: opSearchRepos,
  searchCode: opSearchCode,
};

function handleError(err) {
  if (err.message?.startsWith("GitHub")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`GitHub: Auth failed — ${msg}. Check your PAT permissions.`);
  if (status === 404) throw new Error(`GitHub: Resource not found — ${msg}. Check owner/repo values.`);
  if (status === 409) throw new Error(`GitHub: Conflict — ${msg}`);
  if (status === 422) throw new Error(`GitHub: Validation error — ${msg}`);
  if (status === 429) throw new Error("GitHub: Rate limit exceeded. Slow down requests.");
  throw new Error(`GitHub: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listIssues" } = config;

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `GitHub: Unknown operation "${operation}".`, skipped: true };

    if (!NO_REPO_OPS.has(operation)) {
      if (!config.owner) return { success: false, error: "GitHub: 'owner' (GitHub username or org) is required.", skipped: true };
      if (!config.repo) return { success: false, error: "GitHub: 'repo' is required.", skipped: true };
    }

    if (!config.credentialId) return { success: false, error: "GitHub: No credential selected — pick a GitHub Personal Access Token credential.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `GitHub: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, token, context);
    } catch (err) {
      handleError(err);
    }
  },
};

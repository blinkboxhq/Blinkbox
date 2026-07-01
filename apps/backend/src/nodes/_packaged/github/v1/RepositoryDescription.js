/**
 * GitHub — repos, users & search. Handlers receive `(config, token)`.
 * These ops (except getRepo) are in NO_REPO_OPS — they don't require owner/repo.
 */
import axios from "axios";
import { headers, repoPath, PER_PAGE, BASE } from "../GenericFunctions.js";

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

export const repositoryOperations = {
  getRepo: opGetRepo,
  listMyRepos: opListMyRepos,
  createRepo: opCreateRepo,
  getUser: opGetUser,
  getAuthenticatedUser: opGetAuthenticatedUser,
  searchIssues: opSearchIssues,
  searchRepos: opSearchRepos,
  searchCode: opSearchCode,
};

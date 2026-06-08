/**
 * GITHUB NODE
 * Interact with the GitHub REST API.
 *
 * Operations:
 *   createIssue    — Create an issue in a repo
 *   getIssue       — Fetch a single issue
 *   listIssues     — List issues for a repo
 *   createComment  — Add a comment to an issue or PR
 *   createPR       — Open a pull request
 *   createFile     — Create or update a file in a repo (commits directly to a branch)
 *   mergePR        — Merge a pull request
 *   getRepo        — Get repository metadata
 *   listPRs        — List pull requests
 *   createRelease  — Create a GitHub release
 *
 * Auth: Personal Access Token (PAT) or GitHub App token stored in vault
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

function handleError(err) {
  if (err.message?.startsWith("GitHub")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`GitHub: Auth failed — ${msg}. Check your PAT permissions.`);
  if (status === 404) throw new Error(`GitHub: Resource not found — ${msg}. Check owner/repo values.`);
  if (status === 422) throw new Error(`GitHub: Validation error — ${msg}`);
  throw new Error(`GitHub: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listIssues", owner, repo } = config;
    if (!owner) return { success: false, error: "GitHub: 'owner' (GitHub username or org) is required — configure this field.", skipped: true };
    if (!repo) return { success: false, error: "GitHub: 'repo' is required — configure this field.", skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "GitHub: No credential selected — pick a GitHub Personal Access Token credential.", skipped: true };
    }
    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `GitHub: Could not resolve credential — ${e.message}`, skipped: true };
    }
    const h = headers(token);

    try {
      switch (operation) {
        case "createIssue": {
          const { title, body, labels, assignees } = config;
          if (!title) return { success: false, error: "GitHub createIssue: 'title' is required — configure this field.", skipped: true };
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/issues`, {
            title, body,
            labels: labels ? String(labels).split(",").map((l) => l.trim()) : undefined,
            assignees: assignees ? String(assignees).split(",").map((a) => a.trim()) : undefined,
          }, { headers: h, timeout: 15000 });
          return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
        }

        case "getIssue": {
          if (!config.issueNumber) return { success: false, error: "GitHub getIssue: 'issueNumber' is required — configure this field.", skipped: true };
          const res = await axios.get(`${BASE}/repos/${owner}/${repo}/issues/${config.issueNumber}`, { headers: h, timeout: 15000 });
          return { number: res.data.number, title: res.data.title, body: res.data.body, state: res.data.state, url: res.data.html_url, author: res.data.user?.login, labels: res.data.labels?.map((l) => l.name) };
        }

        case "listIssues": {
          const res = await axios.get(`${BASE}/repos/${owner}/${repo}/issues`, {
            headers: h, timeout: 15000,
            params: { state: config.state ?? "open", per_page: Math.min(Number(config.limit ?? 30), 100), labels: config.labels },
          });
          return { issues: res.data.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, author: i.user?.login })), count: res.data.length };
        }

        case "createComment": {
          if (!config.issueNumber) return { success: false, error: "GitHub createComment: 'issueNumber' is required — configure this field.", skipped: true };
          if (!config.body) return { success: false, error: "GitHub createComment: 'body' is required — configure this field.", skipped: true };
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/issues/${config.issueNumber}/comments`, { body: config.body }, { headers: h, timeout: 15000 });
          return { id: res.data.id, url: res.data.html_url, body: res.data.body };
        }

        case "createPR": {
          const { title, body: prBody, head, base = "main" } = config;
          if (!title || !head) return { success: false, error: "GitHub createPR: 'title' and 'head' branch are required.", skipped: true };
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/pulls`, { title, body: prBody, head, base }, { headers: h, timeout: 15000 });
          return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
        }

        case "createFile": {
          const { path, content, commitMessage, branch } = config;
          if (!path) return { success: false, error: "GitHub createFile: 'path' is required — e.g. 'docs/notes.md'.", skipped: true };
          if (content === undefined || content === null) return { success: false, error: "GitHub createFile: 'content' is required.", skipped: true };
          if (!commitMessage) return { success: false, error: "GitHub createFile: 'commitMessage' is required.", skipped: true };

          // The Contents API updates a file when given its current blob sha, and
          // creates it when sha is omitted — look up any existing file first so
          // both create and update work through the same operation.
          let sha;
          try {
            const existing = await axios.get(`${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
              headers: h, timeout: 15000, params: branch ? { ref: branch } : undefined,
            });
            sha = existing.data.sha;
          } catch (e) {
            if (e.response?.status !== 404) throw e;
          }

          const res = await axios.put(`${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
            message: commitMessage,
            content: Buffer.from(String(content), "utf-8").toString("base64"),
            branch,
            sha,
          }, { headers: h, timeout: 15000 });
          return { path: res.data.content?.path, sha: res.data.content?.sha, url: res.data.content?.html_url, commitSha: res.data.commit?.sha, updated: Boolean(sha) };
        }

        case "mergePR": {
          if (!config.prNumber) return { success: false, error: "GitHub mergePR: 'prNumber' is required.", skipped: true };
          const res = await axios.put(`${BASE}/repos/${owner}/${repo}/pulls/${config.prNumber}/merge`, {
            commit_title: config.commitTitle,
            merge_method: config.mergeMethod ?? "merge",
          }, { headers: h, timeout: 15000 });
          return { merged: res.data.merged, sha: res.data.sha, message: res.data.message };
        }

        case "listPRs": {
          const res = await axios.get(`${BASE}/repos/${owner}/${repo}/pulls`, {
            headers: h, timeout: 15000,
            params: { state: config.state ?? "open", per_page: Math.min(Number(config.limit ?? 30), 100) },
          });
          return { pullRequests: res.data.map((p) => ({ number: p.number, title: p.title, state: p.state, url: p.html_url, author: p.user?.login, head: p.head?.ref, base: p.base?.ref })), count: res.data.length };
        }

        case "getRepo": {
          const res = await axios.get(`${BASE}/repos/${owner}/${repo}`, { headers: h, timeout: 15000 });
          return { name: res.data.name, fullName: res.data.full_name, description: res.data.description, stars: res.data.stargazers_count, forks: res.data.forks_count, url: res.data.html_url, defaultBranch: res.data.default_branch };
        }

        case "createRelease": {
          const { tagName, name: relName, body: relBody, draft = false, prerelease = false } = config;
          if (!tagName) return { success: false, error: "GitHub createRelease: 'tagName' is required.", skipped: true };
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/releases`, { tag_name: tagName, name: relName ?? tagName, body: relBody, draft, prerelease }, { headers: h, timeout: 15000 });
          return { id: res.data.id, url: res.data.html_url, tagName: res.data.tag_name, name: res.data.name };
        }

        default:
          throw new Error(`GitHub: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

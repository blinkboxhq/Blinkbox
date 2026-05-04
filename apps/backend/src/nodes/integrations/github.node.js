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
 *   mergePR        — Merge a pull request
 *   getRepo        — Get repository metadata
 *   listPRs        — List pull requests
 *   createRelease  — Create a GitHub release
 *
 * Auth: Personal Access Token (PAT) or GitHub App token stored in vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.github.com";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "GitHub");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
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
    if (!repo && operation !== "getRepo") return { success: false, error: "GitHub: 'repo' is required — configure this field.", skipped: true };

    const token = await getToken(config.credentialId, context.workspaceId);
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
          if (!title || !head) throw new Error("GitHub createPR: 'title' and 'head' branch are required.");
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/pulls`, { title, body: prBody, head, base }, { headers: h, timeout: 15000 });
          return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
        }

        case "mergePR": {
          if (!config.prNumber) throw new Error("GitHub mergePR: 'prNumber' is required.");
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
          if (!tagName) throw new Error("GitHub createRelease: 'tagName' is required.");
          const res = await axios.post(`${BASE}/repos/${owner}/${repo}/releases`, { tag_name: tagName, name: relName ?? tagName, body: relBody, draft, prerelease }, { headers: h, timeout: 15000 });
          return { id: res.data.id, url: res.data.html_url, tagName: res.data.tag_name, name: res.data.name };
        }

        default:
          throw new Error(`GitHub: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};

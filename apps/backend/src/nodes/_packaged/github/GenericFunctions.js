/**
 * GitHub — shared helpers for all v1 action files.
 * The requester is built by the backend entry (apps/backend/.../github.node.js)
 * with the resolved token and passed into every handler as `token` — the same
 * calling convention as the original monolith: handler(config, token, context).
 */
import axios from "axios";

export const BASE = "https://api.github.com";

export function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

export function repoPath(config) {
  return `${BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

export function csv(v) {
  return v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

export const PER_PAGE = (config, def = 30) => Math.min(Number(config.limit || def), 100);

export const NO_REPO_OPS = new Set([
  "getAuthenticatedUser", "listMyRepos", "createRepo", "getUser", "listUserRepos",
  "searchIssues", "searchRepos", "searchCode", "listOrgRepos",
]);

export function handleError(err) {
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

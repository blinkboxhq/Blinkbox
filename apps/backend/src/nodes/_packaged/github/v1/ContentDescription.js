/**
 * GitHub — repository file content (create/update, get, delete).
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { headers, repoPath } from "../GenericFunctions.js";

async function opCreateFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub createFile: 'path' is required.", skipped: true };
  if (config.content === undefined || config.content === null) return { success: false, error: "GitHub createFile: 'content' is required.", skipped: true };
  if (!config.commitMessage) return { success: false, error: "GitHub createFile: 'commitMessage' is required.", skipped: true };
  let sha;
  try {
    const existing = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 120000, params: config.branch ? { ref: config.branch } : undefined });
    sha = existing.data.sha;
  } catch (e) {
    if (e.response?.status !== 404) throw e;
  }
  const res = await axios.put(`${repoPath(config)}/contents/${config.path}`, {
    message: config.commitMessage,
    content: Buffer.from(String(config.content), "utf-8").toString("base64"),
    branch: config.branch || undefined, sha,
  }, { headers: headers(token), timeout: 120000 });
  return { path: res.data.content?.path, sha: res.data.content?.sha, url: res.data.content?.html_url, commitSha: res.data.commit?.sha, updated: Boolean(sha) };
}

async function opGetFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub getFile: 'path' is required.", skipped: true };
  const res = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 120000, params: config.branch ? { ref: config.branch } : undefined });
  if (Array.isArray(res.data)) {
    return { isDirectory: true, entries: res.data.map((e) => ({ name: e.name, path: e.path, type: e.type, sha: e.sha })) };
  }
  const content = res.data.content ? Buffer.from(res.data.content, "base64").toString("utf-8") : undefined;
  return { path: res.data.path, sha: res.data.sha, size: res.data.size, content, url: res.data.html_url };
}

async function opDeleteFile(config, token) {
  if (!config.path) return { success: false, error: "GitHub deleteFile: 'path' is required.", skipped: true };
  if (!config.commitMessage) return { success: false, error: "GitHub deleteFile: 'commitMessage' is required.", skipped: true };
  const existing = await axios.get(`${repoPath(config)}/contents/${config.path}`, { headers: headers(token), timeout: 120000, params: config.branch ? { ref: config.branch } : undefined });
  const res = await axios.delete(`${repoPath(config)}/contents/${config.path}`, {
    headers: headers(token), timeout: 120000,
    data: { message: config.commitMessage, sha: existing.data.sha, branch: config.branch || undefined },
  });
  return { deleted: true, path: config.path, commitSha: res.data.commit?.sha };
}

export const contentOperations = {
  createFile: opCreateFile,
  getFile: opGetFile,
  deleteFile: opDeleteFile,
};

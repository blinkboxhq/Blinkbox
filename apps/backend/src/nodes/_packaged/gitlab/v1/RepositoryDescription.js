/**
 * GITLAB — Project & Repository resource. getProject preserved verbatim from the
 * monolith; listProjects (account-scoped), listBranches, createBranch,
 * deleteBranch, listCommits, getFile, listTags added for parity. Handlers
 * receive (config, client).
 */
import { requireProject, clampLimit } from "../GenericFunctions.js";

async function opGetProject(config, client) {
  const api = requireProject(client);
  const res = await client.get(api);
  const p = res.data;
  return { id: p.id, name: p.name, description: p.description, web_url: p.web_url, default_branch: p.default_branch, visibility: p.visibility, star_count: p.star_count, forks_count: p.forks_count };
}

async function opListProjects(config, client) {
  const params = { per_page: clampLimit(config.limit), membership: true, order_by: "last_activity_at" };
  if (config.search) params.search = config.search;
  const res = await client.get(`${client.root}/projects`, params);
  return { items: res.data.map((p) => ({ id: p.id, name: p.name, path_with_namespace: p.path_with_namespace, web_url: p.web_url, default_branch: p.default_branch, visibility: p.visibility })), count: res.data.length };
}

async function opListBranches(config, client) {
  const api = requireProject(client);
  const params = { per_page: clampLimit(config.limit) };
  if (config.search) params.search = config.search;
  const res = await client.get(`${api}/repository/branches`, params);
  return { items: res.data.map((b) => ({ name: b.name, default: b.default, protected: b.protected, commit: b.commit?.short_id, web_url: b.web_url })), count: res.data.length };
}

async function opCreateBranch(config, client) {
  const api = requireProject(client);
  if (!config.branch || !config.ref) return { success: false, error: "gitlab createBranch: 'branch' and 'ref' are required.", skipped: true };
  const res = await client.post(`${api}/repository/branches`, null, { branch: config.branch, ref: config.ref });
  return { name: res.data.name, commit: res.data.commit?.short_id, web_url: res.data.web_url };
}

async function opDeleteBranch(config, client) {
  const api = requireProject(client);
  if (!config.branch) return { success: false, error: "gitlab deleteBranch: 'branch' is required.", skipped: true };
  await client.del(`${api}/repository/branches/${encodeURIComponent(config.branch)}`);
  return { deleted: true, branch: config.branch };
}

async function opListCommits(config, client) {
  const api = requireProject(client);
  const params = { per_page: clampLimit(config.limit) };
  if (config.ref) params.ref_name = config.ref;
  const res = await client.get(`${api}/repository/commits`, params);
  return { items: res.data.map((c) => ({ id: c.short_id, title: c.title, author: c.author_name, created_at: c.created_at, web_url: c.web_url })), count: res.data.length };
}

async function opGetFile(config, client) {
  const api = requireProject(client);
  if (!config.filePath) return { success: false, error: "gitlab getFile: 'filePath' is required.", skipped: true };
  const ref = config.ref || "main";
  const res = await client.get(`${api}/repository/files/${encodeURIComponent(config.filePath)}`, { ref });
  const f = res.data;
  const content = f.encoding === "base64" ? Buffer.from(f.content, "base64").toString("utf8") : f.content;
  return { file_path: f.file_path, size: f.size, ref, content, blob_id: f.blob_id, last_commit_id: f.last_commit_id };
}

async function opListTags(config, client) {
  const api = requireProject(client);
  const res = await client.get(`${api}/repository/tags`, { per_page: clampLimit(config.limit) });
  return { items: res.data.map((t) => ({ name: t.name, message: t.message, commit: t.commit?.short_id, target: t.target })), count: res.data.length };
}

export const repositoryOperations = {
  getProject: opGetProject,
  listProjects: opListProjects,
  listBranches: opListBranches,
  createBranch: opCreateBranch,
  deleteBranch: opDeleteBranch,
  listCommits: opListCommits,
  getFile: opGetFile,
  listTags: opListTags,
};

/**
 * Azure DevOps — repositories, branches, commits. Handlers receive `(config, ctx)`.
 */
import { API, enc, LIMIT, skip, get } from "../GenericFunctions.js";

async function opListRepos(config, ctx) {
  if (!config.project) return skip("listRepos", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories?api-version=${API}`, ctx);
  return { repositories: (data.value || []).map((r) => ({ id: r.id, name: r.name, defaultBranch: r.defaultBranch, url: r.webUrl })), count: data.count };
}

async function opGetRepo(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("getRepo", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, defaultBranch: data.defaultBranch, size: data.size, url: data.webUrl };
}

async function opListBranches(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listBranches", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/refs?filter=heads/&api-version=${API}`, ctx);
  return { branches: (data.value || []).map((b) => ({ name: b.name.replace("refs/heads/", ""), objectId: b.objectId })), count: data.count };
}

async function opListCommits(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listCommits", "'project' and 'repositoryId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/commits?searchCriteria.$top=${LIMIT(config, 30)}&api-version=${API}`, ctx);
  return { commits: (data.value || []).map((c) => ({ id: c.commitId, comment: c.comment, author: c.author?.name, date: c.author?.date })), count: data.count };
}

export const repositoryOperations = {
  listRepos: opListRepos,
  getRepo: opGetRepo,
  listBranches: opListBranches,
  listCommits: opListCommits,
};

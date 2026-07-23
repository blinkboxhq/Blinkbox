/**
 * Azure DevOps — pull requests. Handlers receive `(config, ctx)`.
 */
import { API, enc, csv, LIMIT, skip, get, post, patch, axios } from "../GenericFunctions.js";

async function opCreatePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.sourceRefName) return skip("createPR", "'project', 'repositoryId' and 'sourceRefName' are required");
  const body = {
    sourceRefName: config.sourceRefName,
    targetRefName: config.targetRefName || "refs/heads/main",
    title: config.prTitle || config.title,
    description: config.prDescription || config.description,
  };
  if (config.reviewers) body.reviewers = csv(config.reviewers).map((id) => ({ id }));
  const data = await post(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, url: data._links?.web?.href, created: true };
}

async function opGetPR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("getPR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, ctx);
  return { id: data.pullRequestId, title: data.title, status: data.status, sourceRefName: data.sourceRefName, targetRefName: data.targetRefName, url: data._links?.web?.href };
}

async function opListPRs(config, ctx) {
  if (!config.project || !config.repositoryId) return skip("listPRs", "'project' and 'repositoryId' are required");
  const status = config.prStatus ? `&searchCriteria.status=${enc(config.prStatus)}` : "";
  const data = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests?$top=${LIMIT(config)}${status}&api-version=${API}`, ctx);
  return { pullRequests: (data.value || []).map((p) => ({ id: p.pullRequestId, title: p.title, status: p.status, createdBy: p.createdBy?.displayName })), count: data.count };
}

async function opUpdatePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("updatePR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const body = {};
  if (config.prTitle) body.title = config.prTitle;
  if (config.prDescription) body.description = config.prDescription;
  if (config.prStatus) body.status = config.prStatus;
  const data = await patch(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, updated: true };
}

async function opCompletePR(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId) return skip("completePR", "'project', 'repositoryId' and 'pullRequestId' are required");
  const pr = await get(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, ctx);
  const body = {
    status: "completed",
    lastMergeSourceCommit: pr.lastMergeSourceCommit,
    completionOptions: { mergeStrategy: config.mergeStrategy || "squash", deleteSourceBranch: !!config.deleteSourceBranch },
  };
  const data = await patch(`${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}?api-version=${API}`, body, ctx);
  return { id: data.pullRequestId, status: data.status, completed: true };
}

async function opAddPRReviewer(config, ctx) {
  if (!config.project || !config.repositoryId || !config.pullRequestId || !config.reviewerId) return skip("addPRReviewer", "'project', 'repositoryId', 'pullRequestId' and 'reviewerId' are required");
  const data = await axios
    .put(
      `${ctx.PROJ}/_apis/git/repositories/${enc(config.repositoryId)}/pullrequests/${enc(config.pullRequestId)}/reviewers/${enc(config.reviewerId)}?api-version=${API}`,
      { vote: 0 },
      { headers: ctx.headers, timeout: 120000 }
    )
    .then((r) => r.data);
  return { reviewerId: data.id, added: true };
}

export const pullRequestOperations = {
  createPR: opCreatePR,
  getPR: opGetPR,
  listPRs: opListPRs,
  updatePR: opUpdatePR,
  completePR: opCompletePR,
  addPRReviewer: opAddPRReviewer,
};

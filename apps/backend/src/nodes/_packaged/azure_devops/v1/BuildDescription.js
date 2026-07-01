/**
 * Azure DevOps — builds. Handlers receive `(config, ctx)`.
 */
import { API, enc, LIMIT, skip, get, post } from "../GenericFunctions.js";

async function opListBuilds(config, ctx) {
  if (!config.project) return skip("listBuilds", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/build/builds?$top=${LIMIT(config, 30)}&api-version=${API}`, ctx);
  return { builds: (data.value || []).map((b) => ({ id: b.id, buildNumber: b.buildNumber, status: b.status, result: b.result, definition: b.definition?.name })), count: data.count };
}

async function opGetBuild(config, ctx) {
  if (!config.project || !config.buildId) return skip("getBuild", "'project' and 'buildId' are required");
  const data = await get(`${ctx.PROJ}/_apis/build/builds/${enc(config.buildId)}?api-version=${API}`, ctx);
  return { id: data.id, buildNumber: data.buildNumber, status: data.status, result: data.result, url: data._links?.web?.href };
}

async function opQueueBuild(config, ctx) {
  if (!config.project || !config.definitionId) return skip("queueBuild", "'project' and 'definitionId' are required");
  const body = { definition: { id: Number(config.definitionId) } };
  if (config.branch) body.sourceBranch = `refs/heads/${config.branch}`;
  const data = await post(`${ctx.PROJ}/_apis/build/builds?api-version=${API}`, body, ctx);
  return { id: data.id, buildNumber: data.buildNumber, status: data.status, queued: true };
}

export const buildOperations = {
  listBuilds: opListBuilds,
  getBuild: opGetBuild,
  queueBuild: opQueueBuild,
};

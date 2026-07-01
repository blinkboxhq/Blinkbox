/**
 * Azure DevOps — pipelines & pipeline runs. Handlers receive `(config, ctx)`.
 */
import { API, enc, skip, get, post } from "../GenericFunctions.js";

async function opListPipelines(config, ctx) {
  if (!config.project) return skip("listPipelines", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines?api-version=${API}`, ctx);
  return { pipelines: (data.value || []).map((p) => ({ id: p.id, name: p.name, folder: p.folder })), count: data.count };
}

async function opGetPipeline(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("getPipeline", "'project' and 'pipelineId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}?api-version=${API}`, ctx);
  return { id: data.id, name: data.name, folder: data.folder, url: data._links?.web?.href };
}

async function opRunPipeline(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("runPipeline", "'project' and 'pipelineId' are required");
  const body = {};
  if (config.branch) body.resources = { repositories: { self: { refName: `refs/heads/${config.branch}` } } };
  const data = await post(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs?api-version=${API}`, body, ctx);
  return { id: data.id, state: data.state, url: data._links?.web?.href, started: true };
}

async function opListPipelineRuns(config, ctx) {
  if (!config.project || !config.pipelineId) return skip("listPipelineRuns", "'project' and 'pipelineId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs?api-version=${API}`, ctx);
  return { runs: (data.value || []).map((r) => ({ id: r.id, state: r.state, result: r.result, createdDate: r.createdDate })), count: data.count };
}

async function opGetPipelineRun(config, ctx) {
  if (!config.project || !config.pipelineId || !config.runId) return skip("getPipelineRun", "'project', 'pipelineId' and 'runId' are required");
  const data = await get(`${ctx.PROJ}/_apis/pipelines/${enc(config.pipelineId)}/runs/${enc(config.runId)}?api-version=${API}`, ctx);
  return { id: data.id, state: data.state, result: data.result, url: data._links?.web?.href };
}

export const pipelineOperations = {
  listPipelines: opListPipelines,
  getPipeline: opGetPipeline,
  runPipeline: opRunPipeline,
  listPipelineRuns: opListPipelineRuns,
  getPipelineRun: opGetPipelineRun,
};

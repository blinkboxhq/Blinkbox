/**
 * GITLAB — Pipeline & Job resource. triggerPipeline preserved verbatim from the
 * monolith; listPipelines, getPipeline, cancelPipeline, retryPipeline, listJobs
 * added for parity. Handlers receive (config, client).
 */
import { requireProject, clampLimit, parseJsonMaybe } from "../GenericFunctions.js";

function pipelineOut(p) {
  return { id: p.id, status: p.status, ref: p.ref, sha: p.sha, web_url: p.web_url };
}

async function opTriggerPipeline(config, client) {
  const api = requireProject(client);
  const vars = parseJsonMaybe(config.variables, {});
  const body = { ref: config.ref || "main" };
  if (vars && typeof vars === "object") {
    body.variables = Object.entries(vars).map(([key, value]) => ({ key, value: String(value) }));
  }
  const res = await client.post(`${api}/pipeline`, body);
  return pipelineOut(res.data);
}

async function opListPipelines(config, client) {
  const api = requireProject(client);
  const params = { per_page: clampLimit(config.limit) };
  if (config.ref) params.ref = config.ref;
  if (config.status) params.status = config.status;
  const res = await client.get(`${api}/pipelines`, params);
  return { items: res.data.map(pipelineOut), count: res.data.length };
}

async function opGetPipeline(config, client) {
  const api = requireProject(client);
  if (!config.pipelineId) return { success: false, error: "gitlab getPipeline: 'pipelineId' is required.", skipped: true };
  const res = await client.get(`${api}/pipelines/${config.pipelineId}`);
  const p = res.data;
  return { ...pipelineOut(p), duration: p.duration, created_at: p.created_at, updated_at: p.updated_at, user: p.user?.username };
}

async function opCancelPipeline(config, client) {
  const api = requireProject(client);
  if (!config.pipelineId) return { success: false, error: "gitlab cancelPipeline: 'pipelineId' is required.", skipped: true };
  const res = await client.post(`${api}/pipelines/${config.pipelineId}/cancel`, {});
  return pipelineOut(res.data);
}

async function opRetryPipeline(config, client) {
  const api = requireProject(client);
  if (!config.pipelineId) return { success: false, error: "gitlab retryPipeline: 'pipelineId' is required.", skipped: true };
  const res = await client.post(`${api}/pipelines/${config.pipelineId}/retry`, {});
  return pipelineOut(res.data);
}

async function opListJobs(config, client) {
  const api = requireProject(client);
  if (!config.pipelineId) return { success: false, error: "gitlab listJobs: 'pipelineId' is required.", skipped: true };
  const res = await client.get(`${api}/pipelines/${config.pipelineId}/jobs`, { per_page: clampLimit(config.limit) });
  return { items: res.data.map((j) => ({ id: j.id, name: j.name, stage: j.stage, status: j.status, web_url: j.web_url })), count: res.data.length };
}

export const pipelineOperations = {
  triggerPipeline: opTriggerPipeline,
  listPipelines: opListPipelines,
  getPipeline: opGetPipeline,
  cancelPipeline: opCancelPipeline,
  retryPipeline: opRetryPipeline,
  listJobs: opListJobs,
};

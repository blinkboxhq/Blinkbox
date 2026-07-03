/**
 * AZURE DEVOPS — Pipeline & Repository resource. listPipelines preserved verbatim
 * from the monolith; runPipeline, getPipeline, listRuns, listRepos,
 * listPullRequests, createPullRequest added for parity. Handlers receive
 * (config, client).
 */

async function opListPipelines(config, client) {
  const res = await client.get(`${client.base}/pipelines?${client.API}`);
  return { items: res.data.value, count: res.data.count };
}

async function opGetPipeline(config, client) {
  if (!config.pipelineId) return { success: false, error: "azure_devops getPipeline: 'pipelineId' is required.", skipped: true };
  const res = await client.get(`${client.base}/pipelines/${config.pipelineId}?${client.API}`);
  return res.data;
}

async function opRunPipeline(config, client) {
  if (!config.pipelineId) return { success: false, error: "azure_devops runPipeline: 'pipelineId' is required.", skipped: true };
  const body = {};
  if (config.branch) body.resources = { repositories: { self: { refName: `refs/heads/${config.branch}` } } };
  const res = await client.post(`${client.base}/pipelines/${config.pipelineId}/runs?${client.API}`, body);
  return { id: res.data.id, state: res.data.state, name: res.data.name, url: res.data.url };
}

async function opListRuns(config, client) {
  if (!config.pipelineId) return { success: false, error: "azure_devops listRuns: 'pipelineId' is required.", skipped: true };
  const res = await client.get(`${client.base}/pipelines/${config.pipelineId}/runs?${client.API}`);
  return { items: res.data.value, count: res.data.count };
}

async function opListRepos(config, client) {
  const res = await client.get(`${client.base}/git/repositories?${client.API}`);
  return { items: (res.data.value || []).map((r) => ({ id: r.id, name: r.name, defaultBranch: r.defaultBranch, webUrl: r.webUrl })), count: res.data.count };
}

async function opListPullRequests(config, client) {
  if (!config.repositoryId) return { success: false, error: "azure_devops listPullRequests: 'repositoryId' is required.", skipped: true };
  const res = await client.get(`${client.base}/git/repositories/${config.repositoryId}/pullrequests?${client.API}`);
  return { items: (res.data.value || []).map((p) => ({ id: p.pullRequestId, title: p.title, status: p.status, sourceRefName: p.sourceRefName, targetRefName: p.targetRefName })), count: res.data.count };
}

async function opCreatePullRequest(config, client) {
  if (!config.repositoryId || !config.title || !config.sourceBranch) {
    return { success: false, error: "azure_devops createPullRequest: 'repositoryId', 'title', and 'sourceBranch' are required.", skipped: true };
  }
  const body = {
    title: config.title,
    description: config.description || "",
    sourceRefName: `refs/heads/${config.sourceBranch}`,
    targetRefName: `refs/heads/${config.targetBranch || "main"}`,
  };
  const res = await client.post(`${client.base}/git/repositories/${config.repositoryId}/pullrequests?${client.API}`, body);
  return { id: res.data.pullRequestId, title: res.data.title, status: res.data.status, url: res.data.url };
}

export const pipelineOperations = {
  listPipelines: opListPipelines,
  getPipeline: opGetPipeline,
  runPipeline: opRunPipeline,
  listRuns: opListRuns,
  listRepos: opListRepos,
  listPullRequests: opListPullRequests,
  createPullRequest: opCreatePullRequest,
};

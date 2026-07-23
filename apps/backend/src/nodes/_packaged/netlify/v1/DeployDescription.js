/**
 * Netlify — deploys & builds. Handlers receive `(config, { api })`.
 */
import { num, skip, deployShape, needSite, needDeploy } from "../GenericFunctions.js";

async function opListDeploys(config, { api }) {
  const e = needSite(config, "listDeploys"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}/deploys`, { params: { per_page: num(config.limit, 20) } });
  return { success: true, count: res.data.length, deploys: res.data.map(deployShape) };
}

async function opGetDeploy(config, { api }) {
  const e = needDeploy(config, "getDeploy"); if (e) return e;
  const res = await api.get(`/deploys/${encodeURIComponent(config.deployId)}`);
  return { success: true, ...deployShape(res.data) };
}

async function opCreateDeploy(config, { api }) {
  const e = needSite(config, "createDeploy"); if (e) return e;
  const body = {};
  if (config.branch) body.branch = config.branch;
  if (config.message) body.title = config.message;
  const res = await api.post(`/sites/${encodeURIComponent(config.siteId)}/deploys`, body, { timeout: 120000 });
  return { success: true, ...deployShape(res.data) };
}

async function opCancelDeploy(config, { api }) {
  const e = needDeploy(config, "cancelDeploy"); if (e) return e;
  const res = await api.post(`/deploys/${encodeURIComponent(config.deployId)}/cancel`, {});
  return { success: true, ...deployShape(res.data) };
}

async function opRestoreDeploy(config, { api }) {
  const e = needDeploy(config, "restoreDeploy"); if (e) return e;
  if (!config.siteId) return skip("restoreDeploy", "'siteId' is required.");
  const res = await api.post(`/sites/${encodeURIComponent(config.siteId)}/deploys/${encodeURIComponent(config.deployId)}/restore`, {});
  return { success: true, ...deployShape(res.data) };
}

async function opLockDeploy(config, { api }) {
  const e = needDeploy(config, "lockDeploy"); if (e) return e;
  const res = await api.post(`/deploys/${encodeURIComponent(config.deployId)}/lock`, {});
  return { success: true, locked: true, ...deployShape(res.data) };
}

async function opUnlockDeploy(config, { api }) {
  const e = needDeploy(config, "unlockDeploy"); if (e) return e;
  const res = await api.post(`/deploys/${encodeURIComponent(config.deployId)}/unlock`, {});
  return { success: true, locked: false, ...deployShape(res.data) };
}

async function opListDeployFiles(config, { api }) {
  const e = needDeploy(config, "listDeployFiles"); if (e) return e;
  const res = await api.get(`/deploys/${encodeURIComponent(config.deployId)}/files`);
  return { success: true, count: res.data.length, files: res.data };
}

async function opTriggerBuild(config, { api }) {
  const e = needSite(config, "triggerBuild"); if (e) return e;
  const res = await api.post(`/sites/${encodeURIComponent(config.siteId)}/builds`, {}, { timeout: 120000 });
  return { success: true, id: res.data.id, deploy_id: res.data.deploy_id, created_at: res.data.created_at };
}

async function opListBuilds(config, { api }) {
  const e = needSite(config, "listBuilds"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}/builds`, { params: { per_page: num(config.limit, 20) } });
  return { success: true, count: res.data.length, builds: res.data };
}

async function opGetBuild(config, { api }) {
  if (!config.buildId) return skip("getBuild", "'buildId' is required.");
  const res = await api.get(`/builds/${encodeURIComponent(config.buildId)}`);
  return { success: true, ...res.data };
}

export const deployOperations = {
  listDeploys: opListDeploys,
  getDeploy: opGetDeploy,
  createDeploy: opCreateDeploy,
  cancelDeploy: opCancelDeploy,
  restoreDeploy: opRestoreDeploy,
  lockDeploy: opLockDeploy,
  unlockDeploy: opUnlockDeploy,
  listDeployFiles: opListDeployFiles,
  triggerBuild: opTriggerBuild,
  triggerDeploy: opTriggerBuild,
  listBuilds: opListBuilds,
  getBuild: opGetBuild,
};

/**
 * Netlify — sites. Handlers receive `(config, { api })`.
 */
import { num, siteShape, needSite } from "../GenericFunctions.js";

async function opListSites(config, { api }) {
  const params = { per_page: num(config.limit, 100) };
  if (config.filter) params.filter = config.filter;
  if (config.name) params.name = config.name;
  const res = await api.get(`/sites`, { params });
  return { success: true, count: res.data.length, sites: res.data.map(siteShape) };
}

async function opGetSite(config, { api }) {
  const e = needSite(config, "getSite"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}`);
  return { success: true, ...siteShape(res.data) };
}

async function opCreateSite(config, { api }) {
  const body = {};
  if (config.name) body.name = config.name;
  if (config.customDomain) body.custom_domain = config.customDomain;
  if (config.repoUrl) {
    body.repo = { provider: config.gitProvider || "github", repo_url: config.repoUrl, branch: config.branch || "main" };
    if (config.buildCommand) body.repo.cmd = config.buildCommand;
    if (config.publishDir) body.repo.dir = config.publishDir;
  }
  const path = config.accountSlug ? `/${encodeURIComponent(config.accountSlug)}/sites` : `/sites`;
  const res = await api.post(path, body);
  return { success: true, ...siteShape(res.data) };
}

async function opUpdateSite(config, { api }) {
  const e = needSite(config, "updateSite"); if (e) return e;
  const body = {};
  if (config.name) body.name = config.name;
  if (config.customDomain) body.custom_domain = config.customDomain;
  if (config.buildCommand || config.publishDir || config.branch) {
    body.build_settings = {};
    if (config.buildCommand) body.build_settings.cmd = config.buildCommand;
    if (config.publishDir) body.build_settings.dir = config.publishDir;
    if (config.branch) body.build_settings.repo_branch = config.branch;
  }
  const res = await api.patch(`/sites/${encodeURIComponent(config.siteId)}`, body);
  return { success: true, ...siteShape(res.data) };
}

async function opDeleteSite(config, { api }) {
  const e = needSite(config, "deleteSite"); if (e) return e;
  await api.delete(`/sites/${encodeURIComponent(config.siteId)}`);
  return { success: true, deleted: config.siteId };
}

export const siteOperations = {
  listSites: opListSites,
  getSite: opGetSite,
  createSite: opCreateSite,
  updateSite: opUpdateSite,
  deleteSite: opDeleteSite,
};

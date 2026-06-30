/**
 * NETLIFY NODE — nuclear dispatch
 * Netlify REST API: sites, deploys, builds, functions, forms, DNS, env vars, hooks.
 * Auth: Netlify Personal Access Token (Bearer) from credential vault.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://api.netlify.com/api/v1";

const skip = (op, msg) => ({ success: false, error: `Netlify ${op}: ${msg}`, skipped: true });
const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);

function deployShape(d) {
  return {
    id: d.id,
    state: d.state,
    url: d.deploy_ssl_url || d.url,
    branch: d.branch,
    created_at: d.created_at,
    deploy_time: d.deploy_time,
    error_message: d.error_message,
  };
}

function siteShape(s) {
  return {
    id: s.id,
    name: s.name,
    url: s.ssl_url || s.url,
    state: s.state,
    created_at: s.created_at,
    updated_at: s.updated_at,
    published_deploy: s.published_deploy?.id,
    build_settings: s.build_settings,
    custom_domain: s.custom_domain,
  };
}

function needSite(config, op) {
  return config.siteId ? null : skip(op, "'siteId' is required.");
}
function needDeploy(config, op) {
  return config.deployId ? null : skip(op, "'deployId' is required.");
}

/* ---------------- Sites ---------------- */

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

/* ---------------- Deploys ---------------- */

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
  const res = await api.post(`/sites/${encodeURIComponent(config.siteId)}/deploys`, body, { timeout: 20000 });
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

/* ---------------- Builds ---------------- */

async function opTriggerBuild(config, { api }) {
  const e = needSite(config, "triggerBuild"); if (e) return e;
  const res = await api.post(`/sites/${encodeURIComponent(config.siteId)}/builds`, {}, { timeout: 20000 });
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

/* ---------------- Functions ---------------- */

async function opListFunctions(config, { api }) {
  const e = needSite(config, "listFunctions"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}/functions`);
  const fns = Array.isArray(res.data) ? res.data : res.data.functions ?? [];
  return { success: true, count: fns.length, functions: fns.map((f) => ({ id: f.id, name: f.name, log_type: f.log_type })) };
}

/* ---------------- Forms ---------------- */

async function opListForms(config, { api }) {
  const e = needSite(config, "listForms"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}/forms`);
  return { success: true, count: res.data.length, forms: res.data };
}

async function opListSubmissions(config, { api }) {
  if (!config.formId) return skip("listSubmissions", "'formId' is required.");
  const res = await api.get(`/forms/${encodeURIComponent(config.formId)}/submissions`, { params: { per_page: num(config.limit, 50) } });
  return { success: true, count: res.data.length, submissions: res.data };
}

async function opDeleteSubmission(config, { api }) {
  if (!config.submissionId) return skip("deleteSubmission", "'submissionId' is required.");
  await api.delete(`/submissions/${encodeURIComponent(config.submissionId)}`);
  return { success: true, deleted: config.submissionId };
}

/* ---------------- Env Vars ---------------- */

async function opListEnvVars(config, { api }) {
  const e = needSite(config, "listEnvVars"); if (e) return e;
  if (!config.accountSlug) return skip("listEnvVars", "'accountSlug' is required.");
  const res = await api.get(`/accounts/${encodeURIComponent(config.accountSlug)}/env`, { params: { site_id: config.siteId } });
  return { success: true, count: res.data.length, envVars: res.data };
}

async function opGetEnvVar(config, { api }) {
  if (!config.accountSlug) return skip("getEnvVar", "'accountSlug' is required.");
  if (!config.key) return skip("getEnvVar", "'key' is required.");
  const res = await api.get(`/accounts/${encodeURIComponent(config.accountSlug)}/env/${encodeURIComponent(config.key)}`, {
    params: config.siteId ? { site_id: config.siteId } : {},
  });
  return { success: true, ...res.data };
}

async function opSetEnvVar(config, { api }) {
  const e = needSite(config, "setEnvVar"); if (e) return e;
  if (!config.key) return skip("setEnvVar", "'key' is required.");
  if (config.value === undefined || config.value === "") return skip("setEnvVar", "'value' is required.");
  const ctx = config.context || "production";
  const body = [{ key: config.key, values: [{ value: String(config.value), context: ctx }] }];
  await api.patch(`/sites/${encodeURIComponent(config.siteId)}/env`, body, { timeout: 20000 });
  return { success: true, key: config.key, context: ctx, updated: true };
}

async function opDeleteEnvVar(config, { api }) {
  const e = needSite(config, "deleteEnvVar"); if (e) return e;
  if (!config.key) return skip("deleteEnvVar", "'key' is required.");
  await api.delete(`/sites/${encodeURIComponent(config.siteId)}/env/${encodeURIComponent(config.key)}`);
  return { success: true, key: config.key, deleted: true };
}

/* ---------------- DNS ---------------- */

async function opListDnsZones(config, { api }) {
  const res = await api.get(`/dns_zones`);
  return { success: true, count: res.data.length, zones: res.data };
}

async function opGetDnsZone(config, { api }) {
  if (!config.zoneId) return skip("getDnsZone", "'zoneId' is required.");
  const res = await api.get(`/dns_zones/${encodeURIComponent(config.zoneId)}`);
  return { success: true, ...res.data };
}

async function opListDnsRecords(config, { api }) {
  if (!config.zoneId) return skip("listDnsRecords", "'zoneId' is required.");
  const res = await api.get(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records`);
  return { success: true, count: res.data.length, records: res.data };
}

async function opCreateDnsRecord(config, { api }) {
  if (!config.zoneId) return skip("createDnsRecord", "'zoneId' is required.");
  if (!config.recordType) return skip("createDnsRecord", "'recordType' is required.");
  if (!config.recordHostname) return skip("createDnsRecord", "'recordHostname' is required.");
  if (!config.recordValue) return skip("createDnsRecord", "'recordValue' is required.");
  const body = { type: config.recordType, hostname: config.recordHostname, value: config.recordValue, ttl: num(config.ttl, 3600) };
  if (config.recordType === "MX") body.priority = num(config.priority, 10);
  const res = await api.post(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records`, body);
  return { success: true, id: res.data.id, ...body };
}

async function opDeleteDnsRecord(config, { api }) {
  if (!config.zoneId) return skip("deleteDnsRecord", "'zoneId' is required.");
  if (!config.recordId) return skip("deleteDnsRecord", "'recordId' is required.");
  await api.delete(`/dns_zones/${encodeURIComponent(config.zoneId)}/dns_records/${encodeURIComponent(config.recordId)}`);
  return { success: true, deleted: config.recordId };
}

/* ---------------- Hooks ---------------- */

async function opListHooks(config, { api }) {
  const e = needSite(config, "listHooks"); if (e) return e;
  const res = await api.get(`/hooks`, { params: { site_id: config.siteId } });
  return { success: true, count: res.data.length, hooks: res.data };
}

async function opCreateHook(config, { api }) {
  const e = needSite(config, "createHook"); if (e) return e;
  if (!config.hookType) return skip("createHook", "'hookType' is required (e.g. github_commit_status, url).");
  if (!config.hookEvent) return skip("createHook", "'hookEvent' is required (e.g. deploy_created).");
  const body = { site_id: config.siteId, type: config.hookType, event: config.hookEvent, data: {} };
  if (config.hookUrl) body.data.url = config.hookUrl;
  const res = await api.post(`/hooks`, body);
  return { success: true, id: res.data.id, type: res.data.type, event: res.data.event };
}

async function opDeleteHook(config, { api }) {
  if (!config.hookId) return skip("deleteHook", "'hookId' is required.");
  await api.delete(`/hooks/${encodeURIComponent(config.hookId)}`);
  return { success: true, deleted: config.hookId };
}

/* ---------------- Account ---------------- */

async function opListAccounts(config, { api }) {
  const res = await api.get(`/accounts`);
  return { success: true, count: res.data.length, accounts: res.data };
}

async function opListAccountMembers(config, { api }) {
  if (!config.accountSlug) return skip("listAccountMembers", "'accountSlug' is required.");
  const res = await api.get(`/accounts/${encodeURIComponent(config.accountSlug)}/members`);
  return { success: true, count: res.data.length, members: res.data };
}

async function opGetCurrentUser(config, { api }) {
  const res = await api.get(`/user`);
  return { success: true, ...res.data };
}

const OPERATIONS = {
  listSites: opListSites,
  getSite: opGetSite,
  createSite: opCreateSite,
  updateSite: opUpdateSite,
  deleteSite: opDeleteSite,
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
  listFunctions: opListFunctions,
  listForms: opListForms,
  listSubmissions: opListSubmissions,
  deleteSubmission: opDeleteSubmission,
  listEnvVars: opListEnvVars,
  getEnvVar: opGetEnvVar,
  setEnvVar: opSetEnvVar,
  updateEnvVar: opSetEnvVar,
  deleteEnvVar: opDeleteEnvVar,
  listDnsZones: opListDnsZones,
  getDnsZone: opGetDnsZone,
  listDnsRecords: opListDnsRecords,
  createDnsRecord: opCreateDnsRecord,
  deleteDnsRecord: opDeleteDnsRecord,
  listHooks: opListHooks,
  createHook: opCreateHook,
  deleteHook: opDeleteHook,
  listAccounts: opListAccounts,
  listAccountMembers: opListAccountMembers,
  getCurrentUser: opGetCurrentUser,
};

function handleError(err) {
  if (err.message?.startsWith("Netlify")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
  if (status === 401) throw new Error(`Netlify: Authentication failed — check your Personal Access Token.`);
  if (status === 403) throw new Error(`Netlify: Forbidden — ${msg}. Token may lack permissions.`);
  if (status === 404) throw new Error(`Netlify: Not found — ${msg}. Check the ID/slug.`);
  if (status === 422) throw new Error(`Netlify: Validation error — ${msg}`);
  if (status === 429) throw new Error(`Netlify: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Netlify: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listSites";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Netlify: Unknown operation "${op}".`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Netlify: No credential selected — pick a Netlify Personal Access Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Netlify");
    } catch (e) {
      return { success: false, error: `Netlify: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });

    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};

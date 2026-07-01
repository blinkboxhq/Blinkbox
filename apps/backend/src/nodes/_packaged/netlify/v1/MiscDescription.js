/**
 * Netlify — functions, forms, hooks & account. Handlers receive `(config, { api })`.
 */
import { num, skip, needSite } from "../GenericFunctions.js";

async function opListFunctions(config, { api }) {
  const e = needSite(config, "listFunctions"); if (e) return e;
  const res = await api.get(`/sites/${encodeURIComponent(config.siteId)}/functions`);
  const fns = Array.isArray(res.data) ? res.data : res.data.functions ?? [];
  return { success: true, count: fns.length, functions: fns.map((f) => ({ id: f.id, name: f.name, log_type: f.log_type })) };
}

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

export const miscOperations = {
  listFunctions: opListFunctions,
  listForms: opListForms,
  listSubmissions: opListSubmissions,
  deleteSubmission: opDeleteSubmission,
  listHooks: opListHooks,
  createHook: opCreateHook,
  deleteHook: opDeleteHook,
  listAccounts: opListAccounts,
  listAccountMembers: opListAccountMembers,
  getCurrentUser: opGetCurrentUser,
};

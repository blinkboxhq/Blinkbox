/**
 * Netlify — environment variables. Handlers receive `(config, { api })`.
 */
import { skip, needSite } from "../GenericFunctions.js";

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
  await api.patch(`/sites/${encodeURIComponent(config.siteId)}/env`, body, { timeout: 120000 });
  return { success: true, key: config.key, context: ctx, updated: true };
}

async function opDeleteEnvVar(config, { api }) {
  const e = needSite(config, "deleteEnvVar"); if (e) return e;
  if (!config.key) return skip("deleteEnvVar", "'key' is required.");
  await api.delete(`/sites/${encodeURIComponent(config.siteId)}/env/${encodeURIComponent(config.key)}`);
  return { success: true, key: config.key, deleted: true };
}

export const envVarOperations = {
  listEnvVars: opListEnvVars,
  getEnvVar: opGetEnvVar,
  setEnvVar: opSetEnvVar,
  updateEnvVar: opSetEnvVar,
  deleteEnvVar: opDeleteEnvVar,
};

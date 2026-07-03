/**
 * RESEND — Domain & API-key resources (control plane). New for parity with the
 * Resend API: createDomain, getDomain, listDomains, verifyDomain, updateDomain,
 * deleteDomain, createApiKey, listApiKeys, deleteApiKey. Handlers receive
 * (config, apiKey).
 */
import axios from "axios";
import { BASE, headers } from "../GenericFunctions.js";

async function opCreateDomain(config, apiKey) {
  if (!config.name) return { success: false, error: "Resend createDomain: 'name' is required — configure this field.", skipped: true };
  const body = { name: config.name };
  if (config.region) body.region = config.region;
  const res = await axios.post(`${BASE}/domains`, body, { headers: headers(apiKey), timeout: 15000 });
  return res.data;
}

async function opGetDomain(config, apiKey) {
  if (!config.domainId) return { success: false, error: "Resend getDomain: 'domainId' is required — configure this field.", skipped: true };
  const res = await axios.get(`${BASE}/domains/${encodeURIComponent(config.domainId)}`, { headers: headers(apiKey), timeout: 10000 });
  return res.data;
}

async function opListDomains(config, apiKey) {
  const res = await axios.get(`${BASE}/domains`, { headers: headers(apiKey), timeout: 10000 });
  return { data: res.data.data ?? [] };
}

async function opVerifyDomain(config, apiKey) {
  if (!config.domainId) return { success: false, error: "Resend verifyDomain: 'domainId' is required — configure this field.", skipped: true };
  const res = await axios.post(`${BASE}/domains/${encodeURIComponent(config.domainId)}/verify`, {}, { headers: headers(apiKey), timeout: 10000 });
  return { verifying: true, ...res.data };
}

async function opUpdateDomain(config, apiKey) {
  if (!config.domainId) return { success: false, error: "Resend updateDomain: 'domainId' is required — configure this field.", skipped: true };
  const body = {};
  if (config.openTracking !== undefined) body.open_tracking = config.openTracking === true;
  if (config.clickTracking !== undefined) body.click_tracking = config.clickTracking === true;
  if (config.tls) body.tls = config.tls;
  const res = await axios.patch(`${BASE}/domains/${encodeURIComponent(config.domainId)}`, body, { headers: headers(apiKey), timeout: 10000 });
  return { updated: true, ...res.data };
}

async function opDeleteDomain(config, apiKey) {
  if (!config.domainId) return { success: false, error: "Resend deleteDomain: 'domainId' is required — configure this field.", skipped: true };
  const res = await axios.delete(`${BASE}/domains/${encodeURIComponent(config.domainId)}`, { headers: headers(apiKey), timeout: 10000 });
  return { deleted: true, ...res.data };
}

async function opCreateApiKey(config, apiKey) {
  if (!config.name) return { success: false, error: "Resend createApiKey: 'name' is required — configure this field.", skipped: true };
  const body = { name: config.name };
  if (config.permission) body.permission = config.permission;
  if (config.domainId) body.domain_id = config.domainId;
  const res = await axios.post(`${BASE}/api-keys`, body, { headers: headers(apiKey), timeout: 10000 });
  return res.data;
}

async function opListApiKeys(config, apiKey) {
  const res = await axios.get(`${BASE}/api-keys`, { headers: headers(apiKey), timeout: 10000 });
  return { data: res.data.data ?? [] };
}

async function opDeleteApiKey(config, apiKey) {
  if (!config.apiKeyId) return { success: false, error: "Resend deleteApiKey: 'apiKeyId' is required — configure this field.", skipped: true };
  await axios.delete(`${BASE}/api-keys/${encodeURIComponent(config.apiKeyId)}`, { headers: headers(apiKey), timeout: 10000 });
  return { deleted: true, apiKeyId: config.apiKeyId };
}

export const domainOperations = {
  createDomain: opCreateDomain,
  getDomain: opGetDomain,
  listDomains: opListDomains,
  verifyDomain: opVerifyDomain,
  updateDomain: opUpdateDomain,
  deleteDomain: opDeleteDomain,
  createApiKey: opCreateApiKey,
  listApiKeys: opListApiKeys,
  deleteApiKey: opDeleteApiKey,
};

/**
 * HubSpot — shared primitives. Credential resolution (Private App / OAuth token
 * via getOAuthToken), a preconfigured axios client, error mapping, and the
 * generic CRM v3 object helpers (create/get/update/delete/list/search) plus the
 * property-map machinery. Handlers receive (config, { api }).
 *
 * Auth: HubSpot Private App access token (pat-...) from the credential vault.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.hubapi.com";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "HubSpot");
}

export function makeClient(token) {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

export const skip = (op, msg) => ({ success: false, error: `HubSpot ${op}: ${msg}`, skipped: true });
export const lim = (v, d) => Math.min(Number(v ?? d) || d, 100);
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
export const enc = encodeURIComponent;

export function need(config, key, op) {
  return config[key] ? null : skip(op, `'${key}' is required.`);
}

export function parseJson(value, op, field) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { throw new Error(`HubSpot ${op}: '${field}' must be valid JSON.`); }
}

export function props(config, map) {
  const out = {};
  for (const [cfgKey, hsKey] of Object.entries(map)) {
    if (config[cfgKey] !== undefined && config[cfgKey] !== "") out[hsKey] = String(config[cfgKey]);
  }
  Object.assign(out, parseJson(config.extraProperties, config.operation, "extraProperties") || {});
  return out;
}

export const flat = (r) => ({ id: r.id, ...r.properties, createdAt: r.createdAt, updatedAt: r.updatedAt });
export const listOut = (data, key = "results") => ({
  success: true,
  data: data[key]?.map(flat) ?? [],
  count: data[key]?.length ?? 0,
  total: data.total,
  paging: data.paging,
});

export const PROPS_BY_OBJECT = {
  contacts: "email,firstname,lastname,phone,company,website,jobtitle,lifecyclestage,hubspot_owner_id",
  companies: "name,domain,phone,city,country,industry,website,numberofemployees,hubspot_owner_id",
  deals: "dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id",
  tickets: "subject,content,hs_pipeline,hs_pipeline_stage,hs_ticket_priority,hubspot_owner_id",
  products: "name,price,description,hs_sku",
  line_items: "name,quantity,price,hs_product_id",
};

export async function createObject(api, object, properties, associations) {
  const payload = { properties };
  if (associations?.length) payload.associations = associations;
  const r = await api.post(`/crm/v3/objects/${object}`, payload);
  return { success: true, ...flat(r.data) };
}
export async function getObject(api, object, id, extra) {
  const properties = PROPS_BY_OBJECT[object];
  const r = await api.get(`/crm/v3/objects/${object}/${enc(id)}`, { params: { properties, ...extra } });
  return { success: true, ...flat(r.data) };
}
export async function updateObject(api, object, id, properties) {
  const r = await api.patch(`/crm/v3/objects/${object}/${enc(id)}`, { properties });
  return { success: true, ...flat(r.data) };
}
export async function deleteObject(api, object, id) {
  await api.delete(`/crm/v3/objects/${object}/${enc(id)}`);
  return { success: true, deleted: true, id };
}
export async function listObjects(api, object, config) {
  const params = { limit: lim(config.limit, 20), properties: PROPS_BY_OBJECT[object] };
  if (config.after) params.after = config.after;
  const r = await api.get(`/crm/v3/objects/${object}`, { params });
  return listOut(r.data);
}
export async function searchObjects(api, object, config) {
  const filterGroups = parseJson(config.filterGroups, config.operation, "filterGroups");
  const body = {
    filterGroups: Array.isArray(filterGroups) ? filterGroups : [],
    query: config.query || undefined,
    limit: lim(config.limit, 20),
    properties: PROPS_BY_OBJECT[object].split(","),
    sorts: config.sortProperty ? [{ propertyName: config.sortProperty, direction: config.sortDirection || "DESCENDING" }] : undefined,
  };
  const r = await api.post(`/crm/v3/objects/${object}/search`, body);
  return listOut(r.data);
}

export function handleError(err) {
  if (err.message?.startsWith("HubSpot")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.errors?.[0]?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`HubSpot: Auth failed — ${msg}. Check your Private App token & scopes.`);
  if (status === 404) throw new Error(`HubSpot: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`HubSpot: Bad request — ${msg}.`);
  if (status === 409) throw new Error(`HubSpot: Conflict — ${msg}. A record with this value may already exist.`);
  if (status === 429) throw new Error(`HubSpot: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`HubSpot: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`HubSpot: ${status ?? "Error"} — ${msg}`);
}

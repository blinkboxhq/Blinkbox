/**
 * Vercel — shared helpers for all v1 action files.
 * The `api` axios instance is built by the backend entry
 * (apps/backend/.../vercel.node.js) with the resolved Bearer token and passed
 * into every handler as `{ api }`.
 */
import axios from "axios";

export const API = "https://api.vercel.com";

export const skip = (op, msg) => ({ success: false, error: `Vercel ${op}: ${msg}`, skipped: true });
export const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);
export const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));

export function deployShape(d) {
  return {
    uid: d.uid || d.id,
    name: d.name,
    url: d.url ? `https://${d.url}` : undefined,
    state: d.readyState || d.state,
    target: d.target,
    createdAt: d.createdAt || d.created,
    aliases: d.alias || d.aliasAssigned || [],
    inspectorUrl: d.inspectorUrl,
    creator: d.creator?.username,
  };
}

export function projectShape(p) {
  return {
    id: p.id,
    name: p.name,
    framework: p.framework,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    link: p.link,
    nodeVersion: p.nodeVersion,
    latestDeploymentUrl: p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : undefined,
  };
}

export function makeApi(token, config = {}) {
  const teamParams = config.teamId ? { teamId: config.teamId } : {};
  if (config.slug) teamParams.slug = config.slug;
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    params: teamParams,
    timeout: 15000,
  });
}

export function handleError(err) {
  if (err.message?.startsWith("Vercel")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Vercel: Authentication failed — check your API token.`);
  if (status === 403) throw new Error(`Vercel: Forbidden — ${msg}. Token may lack access to this resource.`);
  if (status === 404) throw new Error(`Vercel: Not found — ${msg}. Check the ID/slug.`);
  if (status === 409) throw new Error(`Vercel: Conflict — ${msg}`);
  if (status === 429) throw new Error(`Vercel: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Vercel: ${status ?? "Network"} error — ${msg}`);
}

/**
 * Netlify — shared helpers for all v1 action files.
 * The requester (`{ api }`, an axios instance) is built by makeReq() with the
 * resolved PAT; every handler is called `(config, { api })`.
 */
import axios from "axios";

export const API = "https://api.netlify.com/api/v1";

export const skip = (op, msg) => ({ success: false, error: `Netlify ${op}: ${msg}`, skipped: true });
export const num = (v, d) => (v === undefined || v === "" ? d : parseInt(v, 10) || d);

export function deployShape(d) {
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

export function siteShape(s) {
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

export function needSite(config, op) {
  return config.siteId ? null : skip(op, "'siteId' is required.");
}
export function needDeploy(config, op) {
  return config.deployId ? null : skip(op, "'deployId' is required.");
}

export function makeReq(token) {
  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { api };
}

export function handleError(err) {
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

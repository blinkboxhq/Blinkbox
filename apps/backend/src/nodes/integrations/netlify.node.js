/**
 * NETLIFY NODE
 * Netlify API v1 — builds, deploys, sites, env vars.
 *
 * Operations:
 *   triggerBuild  — Trigger a new build/deploy for a site
 *   listDeploys   — List recent deploys for a site
 *   getDeploy     — Get a single deploy by ID
 *   cancelDeploy  — Cancel a running deploy
 *   lockDeploy    — Lock or unlock a deploy (pin/unpin as published)
 *   listSites     — List all sites in the account
 *   getSite       — Get info for a specific site
 *   updateEnvVar  — Set an environment variable on a site
 *
 * Auth: Netlify Personal Access Token stored in credential vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API = "https://api.netlify.com/api/v1";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Netlify");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("Netlify")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
  if (status === 401) throw new Error(`Netlify: Authentication failed — check your Personal Access Token.`);
  if (status === 403) throw new Error(`Netlify: Forbidden — ${msg}. Token may lack permissions.`);
  if (status === 404) throw new Error(`Netlify: Not found — ${msg}. Check siteId / deployId.`);
  if (status === 422) throw new Error(`Netlify: Validation error — ${msg}`);
  if (status === 429) throw new Error(`Netlify: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Netlify: ${status ?? "Network"} error — ${msg}`);
}

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

export default {
  async run(config, input, context = {}) {
    const { operation = "triggerBuild" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Netlify: No credential selected — pick a Netlify Personal Access Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Netlify: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "triggerBuild": {
          const { siteId } = config;
          if (!siteId) return { success: false, error: "Netlify triggerBuild: 'siteId' is required.", skipped: true };

          const res = await axios.post(`${API}/sites/${siteId}/builds`, {}, { headers, timeout: 20000 });
          return { success: true, id: res.data.id, deploy_id: res.data.deploy_id, created_at: res.data.created_at };
        }

        case "listDeploys": {
          const { siteId } = config;
          if (!siteId) return { success: false, error: "Netlify listDeploys: 'siteId' is required.", skipped: true };

          const res = await axios.get(`${API}/sites/${siteId}/deploys`, {
            headers,
            params: { per_page: 20 },
            timeout: 15000,
          });
          return {
            success: true,
            count: res.data.length,
            deploys: res.data.map(deployShape),
          };
        }

        case "getDeploy": {
          const { deployId } = config;
          if (!deployId) return { success: false, error: "Netlify getDeploy: 'deployId' is required.", skipped: true };

          const res = await axios.get(`${API}/deploys/${deployId}`, { headers, timeout: 15000 });
          return { success: true, ...deployShape(res.data) };
        }

        case "cancelDeploy": {
          const { deployId } = config;
          if (!deployId) return { success: false, error: "Netlify cancelDeploy: 'deployId' is required.", skipped: true };

          const res = await axios.post(`${API}/deploys/${deployId}/cancel`, {}, { headers, timeout: 15000 });
          return { success: true, ...deployShape(res.data) };
        }

        case "lockDeploy": {
          const { deployId, lockAction } = config;
          if (!deployId) return { success: false, error: "Netlify lockDeploy: 'deployId' is required.", skipped: true };

          const action = lockAction === "unlock" ? "unlock" : "lock";
          const res = await axios.post(`${API}/deploys/${deployId}/${action}`, {}, { headers, timeout: 15000 });
          return { success: true, locked: action === "lock", ...deployShape(res.data) };
        }

        case "listSites": {
          const res = await axios.get(`${API}/sites`, {
            headers,
            params: { per_page: 100 },
            timeout: 15000,
          });
          return {
            success: true,
            count: res.data.length,
            sites: res.data.map((s) => ({
              id: s.id,
              name: s.name,
              url: s.ssl_url || s.url,
              state: s.state,
              published_deploy: s.published_deploy?.id,
            })),
          };
        }

        case "getSite": {
          const { siteId } = config;
          if (!siteId) return { success: false, error: "Netlify getSite: 'siteId' is required.", skipped: true };

          const res = await axios.get(`${API}/sites/${siteId}`, { headers, timeout: 15000 });
          const s = res.data;
          return {
            success: true,
            id: s.id,
            name: s.name,
            url: s.ssl_url || s.url,
            state: s.state,
            created_at: s.created_at,
            updated_at: s.updated_at,
            published_deploy: s.published_deploy?.id,
            build_settings: s.build_settings,
          };
        }

        case "updateEnvVar": {
          const { siteId, key, value, context: envContext } = config;
          if (!siteId) return { success: false, error: "Netlify updateEnvVar: 'siteId' is required.", skipped: true };
          if (!key) return { success: false, error: "Netlify updateEnvVar: 'key' is required.", skipped: true };
          if (value === undefined || value === null || value === "") {
            return { success: false, error: "Netlify updateEnvVar: 'value' is required.", skipped: true };
          }

          const ctx = envContext || "all";
          const body = [{ key, values: [{ value: String(value), context: ctx }] }];

          const res = await axios.patch(`${API}/accounts/${siteId}/env`, body, { headers, timeout: 20000 });
          if (res.status < 200 || res.status >= 300) {
            return { success: false, error: `Netlify updateEnvVar: API returned ${res.status}` };
          }
          return { success: true, key, context: ctx, updated: true };
        }

        default:
          return { success: false, error: `Netlify: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};

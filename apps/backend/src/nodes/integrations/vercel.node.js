/**
 * VERCEL NODE
 * Vercel REST API — deployments, projects, domains, env vars.
 *
 * Operations:
 *   listDeployments — List deployments for a project (with optional state filter)
 *   getDeployment   — Get a single deployment by ID
 *   triggerDeploy   — Create a new deployment from a git branch
 *   cancelDeploy    — Cancel a running deployment
 *   listProjects    — List all projects in the account/team
 *   listDomains     — List domains assigned to a project
 *   addDomain       — Add a domain to a project
 *   getEnvVars      — List environment variables for a project
 *
 * Auth: Vercel API Token (Bearer) stored in credential vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://api.vercel.com";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Vercel");
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("Vercel")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Vercel: Authentication failed — check your API token.`);
  if (status === 403) throw new Error(`Vercel: Forbidden — ${msg}. Token may not have access to this resource.`);
  if (status === 404) throw new Error(`Vercel: Not found — ${msg}. Check projectId or deploymentId.`);
  if (status === 409) throw new Error(`Vercel: Conflict — ${msg}`);
  if (status === 429) throw new Error(`Vercel: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Vercel: ${status ?? "Network"} error — ${msg}`);
}

function deployShape(d) {
  return {
    uid: d.uid,
    url: d.url ? `https://${d.url}` : undefined,
    state: d.readyState || d.state,
    target: d.target,
    createdAt: d.createdAt,
    alias: d.alias || [],
    inspectorUrl: d.inspectorUrl,
  };
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listDeployments" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Vercel: No credential selected — pick a Vercel API Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Vercel: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);
    const teamParam = config.teamId ? { teamId: config.teamId } : {};

    try {
      switch (operation) {
        case "listDeployments": {
          const { projectId, stateFilter, limit } = config;
          const params = { ...teamParam, limit: parseInt(limit) || 10 };
          if (projectId) params.projectId = projectId;
          if (stateFilter && stateFilter !== "all") params.state = stateFilter;

          const res = await axios.get(`${API}/v6/deployments`, { headers, params, timeout: 15000 });
          return {
            success: true,
            count: res.data.deployments.length,
            deployments: res.data.deployments.map(deployShape),
          };
        }

        case "getDeployment": {
          const { deploymentId } = config;
          if (!deploymentId) return { success: false, error: "Vercel getDeployment: 'deploymentId' is required.", skipped: true };

          const res = await axios.get(`${API}/v13/deployments/${deploymentId}`, { headers, params: teamParam, timeout: 15000 });
          return { success: true, ...deployShape(res.data) };
        }

        case "triggerDeploy": {
          const { projectId, branch, target } = config;
          if (!projectId) return { success: false, error: "Vercel triggerDeploy: 'projectId' is required.", skipped: true };

          const body = {
            name: projectId,
            target: target || "production",
            gitSource: {
              type: "github",
              ref: branch || "main",
            },
          };

          const res = await axios.post(`${API}/v13/deployments`, body, {
            headers,
            params: teamParam,
            timeout: 30000,
          });
          return { success: true, ...deployShape(res.data) };
        }

        case "cancelDeploy": {
          const { deploymentId } = config;
          if (!deploymentId) return { success: false, error: "Vercel cancelDeploy: 'deploymentId' is required.", skipped: true };

          const res = await axios.patch(
            `${API}/v12/deployments/${deploymentId}/cancel`,
            {},
            { headers, params: teamParam, timeout: 15000 }
          );
          return { success: true, uid: res.data.uid, state: res.data.readyState || res.data.state };
        }

        case "listProjects": {
          const res = await axios.get(`${API}/v9/projects`, { headers, params: { ...teamParam, limit: 100 }, timeout: 15000 });
          return {
            success: true,
            count: res.data.projects.length,
            projects: res.data.projects.map((p) => ({
              id: p.id,
              name: p.name,
              framework: p.framework,
              updatedAt: p.updatedAt,
              latestDeploymentUrl: p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : undefined,
            })),
          };
        }

        case "listDomains": {
          const { projectId } = config;
          if (!projectId) return { success: false, error: "Vercel listDomains: 'projectId' is required.", skipped: true };

          const res = await axios.get(`${API}/v9/projects/${projectId}/domains`, {
            headers,
            params: teamParam,
            timeout: 15000,
          });
          return {
            success: true,
            count: res.data.domains.length,
            domains: res.data.domains.map((d) => ({
              name: d.name,
              apexName: d.apexName,
              verified: d.verified,
              redirect: d.redirect,
              createdAt: d.createdAt,
            })),
          };
        }

        case "addDomain": {
          const { projectId, domain } = config;
          if (!projectId) return { success: false, error: "Vercel addDomain: 'projectId' is required.", skipped: true };
          if (!domain) return { success: false, error: "Vercel addDomain: 'domain' is required.", skipped: true };

          const res = await axios.post(
            `${API}/v10/projects/${projectId}/domains`,
            { name: domain },
            { headers, params: teamParam, timeout: 15000 }
          );
          return { success: true, name: res.data.name, verified: res.data.verified, apexName: res.data.apexName };
        }

        case "getEnvVars": {
          const { projectId } = config;
          if (!projectId) return { success: false, error: "Vercel getEnvVars: 'projectId' is required.", skipped: true };

          const res = await axios.get(`${API}/v9/projects/${projectId}/env`, {
            headers,
            params: teamParam,
            timeout: 15000,
          });
          return {
            success: true,
            count: res.data.envs.length,
            envVars: res.data.envs.map((e) => ({
              id: e.id,
              key: e.key,
              target: e.target,
              type: e.type,
              createdAt: e.createdAt,
            })),
          };
        }

        default:
          return { success: false, error: `Vercel: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};

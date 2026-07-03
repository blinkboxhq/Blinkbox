/**
 * GITLAB — shared primitives. Resolves the Personal Access Token credential,
 * builds a per-project axios client bound to a SSRF-checked base URL, and maps
 * GitLab REST errors to friendly messages. Import depth from here is THREE
 * levels (`../../../utils/...`) — this file sits at nodes/_packaged/gitlab/.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

const DEFAULT_BASE = "https://gitlab.com";
const TIMEOUT = 15000;

export function clampLimit(v, def = 20, max = 100) {
  return Math.min(Number(v || def), max);
}

export function parseJsonMaybe(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function getClient(config, context) {
  const baseUrl = config.baseUrl || DEFAULT_BASE;
  await assertSafeUrlResolved(baseUrl);
  const token = await getOAuthToken(config.credentialId, context?.workspaceId, "GitLab");
  const headers = { "PRIVATE-TOKEN": token, "Content-Type": "application/json" };
  const root = `${baseUrl}/api/v4`;

  const projectId = config.project || config.projectId || context?.input?.projectId;
  const projectApi = projectId != null ? `${root}/projects/${encodeURIComponent(projectId)}` : null;

  return {
    baseUrl,
    root,
    projectId,
    projectApi,
    get: (url, params) => axios.get(url, { headers, params, timeout: TIMEOUT }),
    post: (url, body, params) => axios.post(url, body, { headers, params, timeout: TIMEOUT }),
    put: (url, body, params) => axios.put(url, body, { headers, params, timeout: TIMEOUT }),
    del: (url, params) => axios.delete(url, { headers, params, timeout: TIMEOUT }),
  };
}

export function requireProject(client) {
  if (!client.projectApi) {
    const e = new Error("gitlab: 'project' (ID or namespace/name) is required.");
    e.__skip = true;
    throw e;
  }
  return client.projectApi;
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith("gitlab:")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
  if (status === 401 || status === 403) throw new Error(`gitlab: Auth failed — ${msg}. Check your Personal Access Token.`);
  if (status === 404) throw new Error(`gitlab: Resource not found — ${msg}. Check project ID or namespace.`);
  if (status === 400 || status === 422) throw new Error(`gitlab: Validation error — ${msg}`);
  throw new Error(`gitlab: ${status ?? "Error"} — ${msg}`);
}

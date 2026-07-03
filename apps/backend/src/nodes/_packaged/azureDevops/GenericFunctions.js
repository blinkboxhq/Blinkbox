/**
 * AZURE DEVOPS — shared primitives. Resolves the PAT credential (Basic auth,
 * empty username), builds an axios client bound to
 * dev.azure.com/{org}/{project}/_apis, and maps errors under the
 * `azure_devops:` prefix. Import depth THREE levels.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const PREFIX = "azure_devops:";
const TIMEOUT = 15000;
const API = "api-version=7.0";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "AzureDevOps");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context) {
  const token = config.token || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${PREFIX} Personal Access Token required.`);
  const auth = Buffer.from(`:${token}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
  const org = config.organization || context?.input?.organization;
  const project = config.project || context?.input?.project;
  const base = `https://dev.azure.com/${org}/${project}/_apis`;
  return {
    org,
    project,
    base,
    API,
    get: (url) => axios.get(url, { headers, timeout: TIMEOUT }),
    post: (url, body, ct) => axios.post(url, body, { headers: ct ? { ...headers, "Content-Type": ct } : headers, timeout: TIMEOUT }),
    patch: (url, body, ct) => axios.patch(url, body, { headers: ct ? { ...headers, "Content-Type": ct } : headers, timeout: TIMEOUT }),
    del: (url) => axios.delete(url, { headers, timeout: TIMEOUT }),
  };
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Check your PAT and scopes.`);
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check organization/project.`);
  throw new Error(`${PREFIX} ${status ?? "Error"} — ${msg}`);
}

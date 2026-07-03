/**
 * GITHUB ISSUE — shared primitives. Resolves the GitHub token (Bearer), builds a
 * repo-scoped axios client against api.github.com, and maps errors under the
 * `github_issue:` prefix. Import depth THREE levels.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const PREFIX = "github_issue:";
const TIMEOUT = 15000;

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "GitHub");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context) {
  const token = config.token || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${PREFIX} GitHub token required.`);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" };
  const owner = config.owner || context?.input?.owner;
  const repo = config.repo || context?.input?.repo;
  const api = `https://api.github.com/repos/${owner}/${repo}/issues`;
  return {
    owner,
    repo,
    api,
    get: (url, params) => axios.get(url, { headers, params, timeout: TIMEOUT }),
    post: (url, body) => axios.post(url, body, { headers, timeout: TIMEOUT }),
    patch: (url, body) => axios.patch(url, body, { headers, timeout: TIMEOUT }),
    put: (url, body) => axios.put(url, body, { headers, timeout: TIMEOUT }),
    del: (url) => axios.delete(url, { headers, timeout: TIMEOUT }),
  };
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Check your token and scopes.`);
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check owner/repo.`);
  if (status === 422) throw new Error(`${PREFIX} Validation error — ${msg}`);
  throw new Error(`${PREFIX} ${status ?? "Error"} — ${msg}`);
}

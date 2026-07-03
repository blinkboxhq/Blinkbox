/**
 * FIGMA — shared primitives. Resolves the Figma Personal Access Token (via
 * resolveCredential + decrypt, or an inline apiToken), builds an axios client
 * bound to the Figma REST base, and maps errors under a caller-supplied prefix
 * (`figma:` for file ops, `figma_comment:` for comment ops). Import depth is
 * THREE levels — this file sits at nodes/_packaged/figma/.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const BASE = "https://api.figma.com/v1";
const TIMEOUT = 15000;

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Figma");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context, prefix) {
  const token = config.apiToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${prefix} Figma Personal Access Token required.`);
  const headers = { "X-Figma-Token": token, "Content-Type": "application/json" };
  return {
    base: BASE,
    get: (url, params) => axios.get(url, { headers, params, timeout: TIMEOUT }),
    post: (url, body) => axios.post(url, body, { headers, timeout: TIMEOUT }),
    del: (url) => axios.delete(url, { headers, timeout: TIMEOUT }),
  };
}

export function makeHandleError(prefix) {
  return function handleError(err) {
    if (err.__skip) return { success: false, error: err.message, skipped: true };
    if (err.message?.startsWith(prefix)) throw err;
    const status = err.response?.status;
    const msg = err.response?.data?.err ?? err.response?.data?.message ?? err.message;
    if (status === 401 || status === 403) throw new Error(`${prefix} Auth failed — ${msg}. Check your Figma token.`);
    if (status === 404) throw new Error(`${prefix} Not found — ${msg}. Check the file key.`);
    throw new Error(`${prefix} ${status ?? "Error"} — ${msg}`);
  };
}

/**
 * GOOGLE FORMS — shared primitives. Resolves the Google OAuth access token
 * (Bearer), builds an axios client against forms.googleapis.com, and maps errors
 * under the `google_forms:` prefix. Import depth THREE levels.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const PREFIX = "google_forms:";
const TIMEOUT = 20000;
const BASE = "https://forms.googleapis.com/v1/forms";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Google");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context) {
  const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${PREFIX} Google OAuth access token required.`);
  const headers = { Authorization: `Bearer ${token}` };
  return {
    BASE,
    get: (path) => axios.get(`${BASE}${path}`, { headers, timeout: TIMEOUT }),
    post: (path, body) => axios.post(`${BASE}${path}`, body, { headers, timeout: TIMEOUT }),
    del: (path) => axios.delete(`${BASE}${path}`, { headers, timeout: TIMEOUT }),
  };
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check the form ID.`);
  if (status === 400) throw new Error(`${PREFIX} Validation error — ${msg}`);
  throw new Error(`${PREFIX} ${status ?? "Error"} — ${msg}`);
}

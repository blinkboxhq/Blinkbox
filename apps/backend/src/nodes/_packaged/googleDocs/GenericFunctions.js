/**
 * GOOGLE DOCS — shared primitives. Resolves the Google OAuth access token
 * (Bearer), builds an axios client against docs.googleapis.com (+ drive for
 * listing), and maps errors under the `google_docs:` prefix. Import depth THREE
 * levels.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const PREFIX = "google_docs:";
const TIMEOUT = 20000;
const DOCS = "https://docs.googleapis.com/v1/documents";
const DRIVE = "https://www.googleapis.com/drive/v3/files";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Google");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context) {
  const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${PREFIX} Google OAuth access token required.`);
  const headers = { Authorization: `Bearer ${token}` };
  return {
    DOCS,
    DRIVE,
    get: (url, params) => axios.get(url, { headers, params, timeout: TIMEOUT }),
    post: (url, body, params) => axios.post(url, body, { headers, params, timeout: TIMEOUT }),
  };
}

export function extractText(content) {
  const body = content || [];
  return body.flatMap((el) => el.paragraph?.elements?.map((e) => e.textRun?.content || "") || []).join("");
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.error_description ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check the document ID.`);
  if (status === 400) throw new Error(`${PREFIX} Validation error — ${msg}`);
  throw new Error(`${PREFIX} ${status ?? "Error"} — ${msg}`);
}

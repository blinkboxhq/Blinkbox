/**
 * DISCORD ROLE ASSIGN — shared primitives. Resolves the Discord Bot Token
 * ("Bot <token>" auth), builds an axios client against the Discord v10 API, and
 * maps errors under the `discord_role_assign:` prefix. Import depth THREE levels.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

const PREFIX = "discord_role_assign:";
const TIMEOUT = 15000;
const BASE = "https://discord.com/api/v10";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Discord");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export async function getClient(config, context) {
  const token = config.botToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
  if (!token) throw new Error(`${PREFIX} Discord Bot Token required.`);
  const headers = { Authorization: `Bot ${token}` };
  return {
    BASE,
    get: (path) => axios.get(`${BASE}${path}`, { headers, timeout: TIMEOUT }),
    post: (path, body) => axios.post(`${BASE}${path}`, body ?? {}, { headers, timeout: TIMEOUT }),
    put: (path, body) => axios.put(`${BASE}${path}`, body ?? {}, { headers, timeout: TIMEOUT }),
    del: (path) => axios.delete(`${BASE}${path}`, { headers, timeout: TIMEOUT }),
  };
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Check the bot token and its permissions.`);
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check the guild/user/role IDs.`);
  if (status === 429) throw new Error(`${PREFIX} Rate limited — ${msg}`);
  throw new Error(`${PREFIX} ${status ?? "Error"} — ${msg}`);
}

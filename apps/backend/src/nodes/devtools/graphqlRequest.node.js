import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = u.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/, /^0:0:0:0:0:0:0:1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/i, /^fe80:/i, /^fd/i,
    /\.internal$/, /\.local$/,
  ];
  if (blocked.some(r => r.test(h))) throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
}

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const url = config.endpoint || config.url || input?.url;
    const query = config.query || input?.query;
    if (!url) return { success: false, error: "graphql_request: 'url' is required.", skipped: true };
    if (!query) return { success: false, error: "graphql_request: 'query' is required.", skipped: true };

    assertSafeUrl(url);

    let variables = config.variables || input?.variables || {};
    if (typeof variables === "string") { try { variables = JSON.parse(variables); } catch { variables = {}; } }

    let extraHeaders = config.headers || {};
    if (typeof extraHeaders === "string") { try { extraHeaders = JSON.parse(extraHeaders); } catch { extraHeaders = {}; } }
    const headers = { "Content-Type": "application/json", ...extraHeaders };

    if (config.authToken || config.credentialId) {
      const token = config.authToken || await getKey(config.credentialId, context?.workspaceId, "GraphQL");
      headers.Authorization = `Bearer ${token}`;
    }

    const timeoutMs = config.timeout ? (config.timeout <= 300 ? config.timeout * 1000 : config.timeout) : 30000;
    const res = await axios.post(url, { query, variables }, { headers, timeout: timeoutMs });
    if (res.data.errors?.length) throw new Error(`GraphQL errors: ${res.data.errors.map((e) => e.message).join("; ")}`);
    return { data: res.data.data, errors: res.data.errors || null, extensions: res.data.extensions || null };
  },
};

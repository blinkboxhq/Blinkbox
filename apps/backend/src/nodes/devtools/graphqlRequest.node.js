import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

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

    await assertSafeUrlResolved(url);

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

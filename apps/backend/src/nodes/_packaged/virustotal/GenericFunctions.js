/**
 * VIRUSTOTAL — shared primitives. Resolves the API key (x-apikey header), builds
 * an axios client against the v3 API, and maps errors under the `virustotal:`
 * prefix. A 404 is a soft miss ({ found: false }), matching the monolith. Import
 * depth THREE levels (no util imports needed — key is passed directly).
 */
import axios from "axios";

const PREFIX = "virustotal:";
const TIMEOUT = 15000;
const BASE = "https://www.virustotal.com/api/v3";

export function getClient(config, context) {
  const apiKey = config.apiKey || context?.input?.apiKey;
  if (!apiKey) throw new Error(`${PREFIX} API key is required.`);
  const headers = { "x-apikey": apiKey };
  return {
    BASE,
    get: (path) => axios.get(`${BASE}${path}`, { headers, timeout: TIMEOUT }),
    post: (path, body, extra) => axios.post(`${BASE}${path}`, body, { headers, timeout: TIMEOUT, ...extra }),
  };
}

export function encodeUrlId(url) {
  return Buffer.from(url).toString("base64url");
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.response?.status === 404) return { found: false, error: "Resource not found in VirusTotal" };
  if (err.message?.startsWith(PREFIX)) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`${PREFIX} Auth failed — ${msg}. Check your API key.`);
  if (status === 429) throw new Error(`${PREFIX} Rate limit exceeded — ${msg}`);
  throw new Error(`[virustotal] ${err.message}`);
}

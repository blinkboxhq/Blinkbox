/**
 * Trello — shared primitives. Credential parsing (apiKey:token or JSON),
 * error mapping, and a thin request wrapper that injects `key`/`token` as
 * query params on every call. Trello API v1.
 *
 * Auth: Trello API key + token — stored as "apiKey:token" or JSON
 * {apiKey, token}. Sent as query parameters, NOT headers.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.trello.com/1";

export async function getRawCredential(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Trello");
}

/** Parse the stored credential into `{ key, token }`, or null if malformed. */
export function parseAuth(raw) {
  let apiKey, token;
  if (raw.includes(":") && !raw.trim().startsWith("{")) {
    [apiKey, token] = raw.split(":");
  } else {
    try {
      const parsed = JSON.parse(raw);
      apiKey = parsed.apiKey ?? parsed.key;
      token = parsed.token;
    } catch {
      return null;
    }
  }
  if (!apiKey || !token) return null;
  return { key: apiKey, token };
}

export function buildClient(auth) {
  return { auth };
}

export function handleError(err) {
  if (err.message?.startsWith("Trello")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Trello: Auth failed — check your API key and token.`);
  if (status === 404) throw new Error(`Trello: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Trello: Bad request — ${msg}`);
  if (status === 429) throw new Error("Trello: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`Trello: Server error (${status}) — try again later.`);
  throw new Error(`Trello: ${status ?? "Error"} — ${msg}`);
}

/**
 * axios wrapper. Merges `key`/`token` into params. Trello mutations pass args
 * as query params with a null body, so `body` is rarely used.
 */
export async function req(client, method, path, { params, body = null, timeout = 120000 } = {}) {
  const res = await axios({
    method,
    url: `${BASE}${path}`,
    params: { ...client.auth, ...(params || {}) },
    ...(body !== null ? { data: body } : { data: null }),
    timeout,
  });
  return res.data;
}

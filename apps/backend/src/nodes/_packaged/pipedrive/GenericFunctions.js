/**
 * Pipedrive — shared primitives. Token resolution, error mapping, and a thin
 * axios wrapper that injects `api_token` as a query param on every call.
 * Pipedrive API v1.
 *
 * Auth: Pipedrive API token — sent as the `api_token` query parameter.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE_URL = "https://api.pipedrive.com/v1";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Pipedrive");
}

export function handleError(err) {
  if (err.message?.startsWith("Pipedrive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Pipedrive: Auth failed — ${msg}. Check your API token.`);
  if (status === 403) throw new Error(`Pipedrive: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`Pipedrive: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Pipedrive: Bad request — ${msg}.`);
  if (status === 422) throw new Error(`Pipedrive: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Pipedrive: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Pipedrive: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Pipedrive: ${status ?? "Error"} — ${msg}`);
}

export function buildClient(apiToken) {
  return axios.create({
    baseURL: BASE_URL,
    params: { api_token: apiToken },
    timeout: 15000,
  });
}

/** Cap the collection limit at Pipedrive's max of 500. */
export function boundLimit(val, def = 25) {
  return Math.min(Number(val) || def, 500);
}

/** Coerce to a Number when numeric, otherwise pass through unchanged. */
export function num(val) {
  const n = Number(val);
  return isNaN(n) ? val : n;
}

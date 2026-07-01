/**
 * Jira — shared helpers for all v1 action files.
 * The requester (`ctx = { domain, headers, BASE, AGILE }`) is built by makeReq()
 * with the resolved base64 Basic-auth credential and the config (it depends on
 * config.domain); every handler is called `(config, ctx)` — the same calling
 * convention as the original monolith.
 *
 * Auth: Basic auth — base64("email:apiToken") stored in vault,
 *       or store as "email:apiToken" and this node encodes it.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export { axios };

export async function getAuth(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Jira");
  if (raw.includes(":")) return Buffer.from(raw).toString("base64");
  return raw;
}

export function adf(text) {
  return { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: String(text) }] }] };
}

export function csv(v) {
  return v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

export const LIMIT = (config, def = 20) => Math.min(Number(config.limit || def), 100);

export function makeReq(base64Auth, config) {
  const { domain } = config;
  return {
    domain,
    headers: { Authorization: `Basic ${base64Auth}`, "Content-Type": "application/json", Accept: "application/json" },
    BASE: `https://${domain}/rest/api/3`,
    AGILE: `https://${domain}/rest/agile/1.0`,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Jira")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errorMessages?.join(", ") || err.response?.data?.message || (err.response?.data?.errors && JSON.stringify(err.response.data.errors)) || err.message;
  if (status === 401 || status === 403) throw new Error(`Jira: Auth failed — ${msg}. Check email and API token.`);
  if (status === 404) throw new Error(`Jira: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Jira: Validation error — ${msg}`);
  if (status === 429) throw new Error("Jira: Rate limit exceeded. Slow down requests.");
  throw new Error(`Jira: ${status ?? "Network"} error — ${msg}`);
}

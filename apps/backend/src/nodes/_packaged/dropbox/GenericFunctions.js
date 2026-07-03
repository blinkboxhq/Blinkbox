/**
 * Dropbox — shared primitives for the modular node. Credential resolution,
 * axios helpers for the RPC / content / longpoll hosts, path normalisation,
 * error mapping. Handlers receive (config, client) where
 * client = { token, headers, rpc, content }.
 *
 * Import depth note: this file lives at _packaged/dropbox/, so utils are three
 * levels up (../../../utils/...). Production nixpacks build context is
 * apps/backend only — never reach into packages/.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const RPC = "https://api.dropboxapi.com/2";
export const CONTENT = "https://content.dropboxapi.com/2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Dropbox");
}

export function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

/** Normalise a user path to Dropbox's leading-slash convention. Root = "". */
export function dbPath(p) {
  if (p === undefined || p === null || p === "") return "";
  return p.startsWith("/") ? p : `/${p}`;
}

/** Number coercion with fallback. */
export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** RPC (JSON) call to api.dropboxapi.com. */
export async function rpc(client, endpoint, body, timeout = 15000) {
  const res = await axios.post(`${RPC}${endpoint}`, body ?? null, {
    headers: client.headers,
    timeout,
  });
  return res.data;
}

/** Content-download call — returns { data (Buffer), meta } from the API result header. */
export async function contentDownload(client, endpoint, arg, timeout = 60000) {
  const res = await axios.post(`${CONTENT}${endpoint}`, null, {
    headers: {
      Authorization: `Bearer ${client.token}`,
      "Dropbox-API-Arg": JSON.stringify(arg),
    },
    responseType: "arraybuffer",
    timeout,
  });
  let meta = {};
  try { meta = JSON.parse(res.headers["dropbox-api-result"] || "{}"); } catch { /* keep empty meta */ }
  return { data: Buffer.from(res.data), meta };
}

/** Content-upload call — sends an octet-stream body with a Dropbox-API-Arg header. */
export async function contentUpload(client, endpoint, arg, buffer, timeout = 60000) {
  const res = await axios.post(`${CONTENT}${endpoint}`, buffer, {
    headers: {
      Authorization: `Bearer ${client.token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify(arg),
    },
    timeout,
  });
  return res.data;
}

/** Fetch a user-supplied URL (SSRF-guarded) into a base64 string for save_url-style flows. */
export async function fetchRemote(url, timeout = 60000) {
  await assertSafeUrlResolved(url);
  const res = await axios.get(url, { responseType: "arraybuffer", timeout });
  return Buffer.from(res.data);
}

/** Shape a file/folder metadata entry into our stable output. */
export function mapEntry(f = {}) {
  return {
    id: f.id,
    name: f.name,
    path: f.path_display,
    tag: f[".tag"],
    size: f.size,
    rev: f.rev,
    clientModified: f.client_modified,
    serverModified: f.server_modified,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Dropbox")) throw err;
  const status = err.response?.status;
  const body = err.response?.data;
  const summary = body?.error_summary ?? body?.error?.reason?.[".tag"] ?? err.message;

  if (status === 401) throw new Error(`Dropbox: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Dropbox: Insufficient permissions — ${summary}. Check the OAuth scopes on the credential.`);
  if (status === 404 || summary?.includes("not_found") || summary?.includes("path/not_found")) {
    throw new Error(`Dropbox: File or folder not found — ${summary}`);
  }
  if (status === 409) throw new Error(`Dropbox: Conflict — ${summary}. The item may already exist or the path is invalid.`);
  if (status === 422) throw new Error(`Dropbox: Unprocessable request (422) — ${summary}.`);
  if (status === 429) throw new Error(`Dropbox: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`Dropbox: Server error (${status}) — ${summary}. Retry later.`);
  throw new Error(`Dropbox: ${status ?? "Network"} error — ${summary}`);
}

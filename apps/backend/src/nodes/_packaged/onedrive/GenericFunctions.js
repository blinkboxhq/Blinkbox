/**
 * ONEDRIVE — shared primitives for the modular node. Microsoft Graph v1.0
 * drive-item URL resolution (path OR item ID), path encoding, remote-fetch
 * with SSRF guard, and error mapping. Handlers receive (config, ctx) where
 * ctx = { token, headers }.
 *
 * Import depth: this file lives at _packaged/onedrive/, so utils are three
 * levels up. Production nixpacks build context is apps/backend only.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const GRAPH = "https://graph.microsoft.com/v1.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "OneDrive");
}

export function authHeaders(token, contentType = "application/json") {
  return { Authorization: `Bearer ${token}`, "Content-Type": contentType };
}

export function num(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Encode a drive path (leading slash stripped, each segment URI-encoded). */
export function encodePath(p) {
  return String(p).replace(/^\//, "").split("/").map(encodeURIComponent).join("/");
}

/** Resolve a path-or-item-id to a Graph drive-item base URL. */
export function itemUrl(pathOrId) {
  if (/^[A-Z0-9!_]{10,}$/i.test(pathOrId) && !pathOrId.startsWith("/")) {
    return `${GRAPH}/me/drive/items/${pathOrId}`;
  }
  return `${GRAPH}/me/drive/root:/${encodePath(pathOrId)}`;
}

/** URL to the children collection of a folder path (blank = root). */
export function childrenUrl(folderPath) {
  return folderPath
    ? `${GRAPH}/me/drive/root:/${encodePath(folderPath)}:/children`
    : `${GRAPH}/me/drive/root/children`;
}

/**
 * Resolve file content into a Buffer. Accepts an http(s) URL (SSRF-guarded,
 * fetched as arraybuffer) or a base64 string.
 */
export async function resolveContent(content) {
  if (/^https?:\/\//i.test(content)) {
    await assertSafeUrlResolved(content);
    const dl = await axios.get(content, { responseType: "arraybuffer", timeout: 120000 });
    return Buffer.from(dl.data);
  }
  return Buffer.from(content, "base64");
}

export function mapItem(f) {
  return {
    id: f.id,
    name: f.name,
    size: f.size,
    webUrl: f.webUrl,
    createdDateTime: f.createdDateTime,
    lastModifiedDateTime: f.lastModifiedDateTime,
    isFolder: !!f.folder,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("OneDrive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`OneDrive: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`OneDrive: Insufficient permissions — ${msg}. Ensure Files.ReadWrite Graph scope is granted.`);
  if (status === 404) throw new Error(`OneDrive: File or folder not found — ${msg}`);
  if (status === 409) throw new Error(`OneDrive: Conflict — ${msg}. The item may already exist.`);
  if (status === 422) throw new Error(`OneDrive: Unprocessable request (422) — ${msg}.`);
  if (status === 429) throw new Error(`OneDrive: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`OneDrive: Server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`OneDrive: ${status ?? "Network"} error — ${msg}`);
}

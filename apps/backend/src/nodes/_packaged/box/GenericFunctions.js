/**
 * Box — shared primitives for the modular node. Credential resolution, axios
 * helpers for the API / upload hosts, item-type resolution, error mapping.
 * Handlers receive (config, client) where client = { token, headers }.
 *
 * Import depth: this file lives at _packaged/box/, so utils are three levels up
 * (../../../utils/...). Production nixpacks build context is apps/backend only.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const API = "https://api.box.com/2.0";
export const UPLOAD_API = "https://upload.box.com/api/2.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Box");
}

export function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

/** files | folders — Box addresses the two collections separately. */
export function itemPath(itemType) {
  return itemType === "folder" ? "folders" : "files";
}

export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function enc(v) {
  return encodeURIComponent(v);
}

export async function apiGet(client, path, params, timeout = 15000) {
  const res = await axios.get(`${API}${path}`, { headers: client.headers, params, timeout });
  return res.data;
}
export async function apiPost(client, path, body, timeout = 15000) {
  const res = await axios.post(`${API}${path}`, body, { headers: client.headers, timeout });
  return res.data;
}
export async function apiPut(client, path, body, timeout = 20000) {
  const res = await axios.put(`${API}${path}`, body, { headers: client.headers, timeout });
  return res.data;
}
export async function apiDelete(client, path, timeout = 15000) {
  const res = await axios.delete(`${API}${path}`, { headers: client.headers, timeout });
  return res.data;
}

/** Multipart upload to the upload host. buffer is the raw file bytes. */
export async function uploadContent(client, buffer, attributes, filename) {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("attributes", JSON.stringify(attributes));
  form.append("file", buffer, { filename });
  const res = await axios.post(`${UPLOAD_API}/files/content`, form, {
    headers: { Authorization: `Bearer ${client.token}`, ...form.getHeaders() },
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return res.data;
}

/** Fetch a user-supplied URL (SSRF-guarded) into a Buffer for upload-from-url flows. */
export async function fetchRemote(url, timeout = 60000) {
  await assertSafeUrlResolved(url);
  const res = await axios.get(url, { responseType: "arraybuffer", timeout });
  return Buffer.from(res.data);
}

/** Shape an item entry into our stable output. */
export function mapItem(f = {}) {
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    size: f.size,
    createdAt: f.created_at,
    modifiedAt: f.modified_at,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Box")) throw err;
  const status = err.response?.status;
  const body = err.response?.data;
  const msg = body?.message ?? body?.context_info?.errors?.[0]?.message ?? err.message;
  const code = body?.code ?? "";

  if (status === 401) throw new Error(`Box: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Box: Insufficient permissions — ${msg}. Check the OAuth scopes on the credential.`);
  if (status === 404 || code === "not_found") throw new Error(`Box: File or folder not found — ${msg}`);
  if (status === 409 || code === "item_name_in_use") throw new Error(`Box: Conflict — ${msg}. The item may already exist.`);
  if (status === 422) throw new Error(`Box: Unprocessable request (422) — ${msg}.`);
  if (status === 429) throw new Error(`Box: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`Box: Server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`Box: ${status ?? "Network"} error — ${msg}`);
}

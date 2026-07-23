/**
 * LinkedIn — shared primitives. OAuth token resolution (vaulted "LinkedIn"
 * credential via getOAuthToken), error mapping, REST/UGC request helpers,
 * author-URN resolution, and the register→PUT media upload flow. Handlers
 * receive the raw bearer token: (config, token).
 *
 * Two API surfaces are used: the legacy /v2 UGC/organizations endpoints (what
 * the original node called) and the versioned /rest Posts + socialActions API.
 * Media URLs are user-supplied, so every fetch is SSRF-guarded.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export const BASE = "https://api.linkedin.com/v2";
export const REST_BASE = "https://api.linkedin.com/rest";
export const UPLOAD_BASE = "https://api.linkedin.com/v2";
/** LinkedIn versioned APIs require a LinkedIn-Version header (YYYYMM). */
export const LI_VERSION = "202405";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "LinkedIn");
}

export function handleError(err) {
  if (err.message?.startsWith("LinkedIn")) throw err;
  const status = err.response?.status;
  const msg =
    err.response?.data?.message ||
    err.response?.data?.error_description ||
    err.response?.data?.serviceErrorCode ||
    err.message;
  if (status === 401) throw new Error("LinkedIn: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`LinkedIn: Permission denied — ${msg}. Check your app's OAuth scopes (w_member_social, r_organization_social).`);
  if (status === 404) throw new Error(`LinkedIn: Resource not found — ${msg}`);
  if (status === 422 || status === 400) throw new Error(`LinkedIn: Bad request — ${msg}`);
  if (status === 429) throw new Error("LinkedIn: Rate limit exceeded. Retry later.");
  throw new Error(`LinkedIn failed: ${status || err.code} — ${err.message}`);
}

export function headers(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    ...extra,
  };
}

/** Versioned /rest headers include LinkedIn-Version. */
export function restHeaders(token, extra = {}) {
  return headers(token, { "LinkedIn-Version": LI_VERSION, ...extra });
}

export function boundCount(val, def = 50, cap = 500) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) return def;
  return Math.min(n, cap);
}

/** Localised LinkedIn field → plain string (en_US preferred, else first). */
export function localized(field) {
  if (!field) return "";
  const loc = field.localized || {};
  return loc.en_US || Object.values(loc)[0] || "";
}

export async function get(token, url, { timeout = 120000, versioned = false } = {}) {
  const { data } = await axios.get(url, {
    headers: versioned ? restHeaders(token) : headers(token),
    timeout,
  });
  return data;
}

export async function post(token, url, body = {}, { timeout = 120000, versioned = false } = {}) {
  const { data, headers: respHeaders } = await axios.post(url, body, {
    headers: versioned ? restHeaders(token) : headers(token),
    timeout,
  });
  return { data, respHeaders };
}

export async function del(token, url, { timeout = 120000, versioned = false } = {}) {
  const { data } = await axios.delete(url, {
    headers: versioned ? restHeaders(token) : headers(token),
    timeout,
  });
  return data;
}

/** Resolve the authenticated member's person URN. */
export async function getPersonUrn(token) {
  const { data } = await axios.get(`${BASE}/me`, { headers: headers(token), timeout: 120000 });
  return `urn:li:person:${data.id}`;
}

/** Normalise a person/org author string into a resolved author URN. */
export async function resolveAuthorUrn(config, token) {
  const postAs = config.postAs || "person";
  if (postAs === "organization") {
    if (!config.orgId) return null;
    const orgId = String(config.orgId).replace(/^urn:li:organization:/, "");
    return `urn:li:organization:${orgId}`;
  }
  return getPersonUrn(token);
}

/**
 * Register an upload, fetch the user-supplied media (SSRF-guarded), PUT the
 * bytes, and return the resulting asset URN. Preserves the original node's
 * register→GET→PUT flow.
 */
export async function uploadMedia(token, authorUrn, mediaUrl, mediaType) {
  const registerPayload = {
    registerUploadRequest: {
      owner: authorUrn,
      recipes: [mediaType === "video" ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
    },
  };

  const { data: regData } = await axios.post(
    `${UPLOAD_BASE}/assets?action=registerUpload`,
    registerPayload,
    { headers: headers(token), timeout: 120000 },
  );

  const asset = regData.value?.asset;
  const uploadUrl = regData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!uploadUrl || !asset) throw new Error("LinkedIn: Failed to register media upload.");

  await assertSafeUrlResolved(mediaUrl);
  const mediaResp = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 120000 });
  await axios.put(uploadUrl, Buffer.from(mediaResp.data), {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    timeout: 120000,
    maxBodyLength: Infinity,
  });

  return asset;
}

/** Split a comma-string or pass an array through, trimmed & filtered. */
export function toList(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Mastodon — shared primitives. Credential resolution (encrypted token via
 * resolveCredential + decrypt), SSRF-guarded instance URL, error mapping, and
 * thin axios wrappers over a per-instance /api/v1 base. Handlers receive a
 * client object: { headers, base }.
 *
 * Auth: per-instance access token (config.accessToken or vaulted "Mastodon"
 * credential). The instance host is user-supplied, so every base URL is passed
 * through assertSafeUrlResolved before any request.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";
import { assertSafeUrlResolved } from "../../../utils/ssrf.js";

export async function getKey(credentialId, workspaceId, type = "Mastodon") {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

/** Normalise a user-supplied instance value into a bare host. */
export function normaliseInstance(rawInstance) {
  return String(rawInstance || "https://mastodon.social").replace(/^https?:\/\//, "");
}

/**
 * Build the { headers, base } client. SSRF-guards the instance origin — the
 * host is user-controlled, so this must run before any handler request.
 */
export async function buildClient(instanceHost, token) {
  await assertSafeUrlResolved(`https://${instanceHost}`);
  return {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    base: `https://${instanceHost}/api/v1`,
  };
}

export function handleError(err) {
  if (err.message?.startsWith("mastodon:")) throw err;
  const status = err.response?.status;
  if (status === 401) throw new Error("mastodon: Unauthorized — check your access token.");
  if (status === 404) throw new Error("mastodon: Not found — check the status/account ID.");
  if (status === 422) throw new Error(`mastodon: Unprocessable — ${err.response?.data?.error || err.message}`);
  if (status === 429) throw new Error("mastodon: Rate limited — add a Delay node.");
  throw new Error(`[mastodon] ${err.message}`);
}

export function boundLimit(val, def = 20) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) return def;
  return Math.min(n, 40);
}

export async function get(client, path, { params, timeout = 15000 } = {}) {
  const { data } = await axios.get(`${client.base}${path}`, {
    headers: client.headers,
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

export async function post(client, path, body = {}, { timeout = 15000 } = {}) {
  const { data } = await axios.post(`${client.base}${path}`, body, { headers: client.headers, timeout });
  return data;
}

export async function del(client, path, { timeout = 15000 } = {}) {
  const { data } = await axios.delete(`${client.base}${path}`, { headers: client.headers, timeout });
  return data;
}

/** GET a /api/v2 endpoint (client.base ends in /api/v1). Used by full search. */
export async function getV2(client, path, { params, timeout = 15000 } = {}) {
  const base2 = client.base.replace(/\/api\/v1$/, "/api/v2");
  const { data } = await axios.get(`${base2}${path}`, {
    headers: client.headers,
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** Compact a status object into the node's public shape. */
export function mapStatus(s) {
  return {
    id: s.id,
    content: s.content,
    account: s.account?.acct,
    url: s.url,
    visibility: s.visibility,
    createdAt: s.created_at,
    reblogsCount: s.reblogs_count,
    favouritesCount: s.favourites_count,
    repliesCount: s.replies_count,
  };
}

export function mapAccount(a) {
  return {
    id: a.id,
    username: a.username,
    acct: a.acct,
    displayName: a.display_name,
    url: a.url,
    followersCount: a.followers_count,
    followingCount: a.following_count,
    statusesCount: a.statuses_count,
    note: a.note,
  };
}

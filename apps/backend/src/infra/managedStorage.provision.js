/**
 * Cloud side of managed storage: mint one tenant's data plane and tear it down.
 *
 * A managed self-hosted box never sees a shared cluster credential. It gets a
 * Mongo user with readWrite on exactly one database and a Redis ACL user pinned
 * to exactly one key prefix, both named after its license. If that box is
 * compromised, the blast radius is that one tenant — which is the whole reason
 * managed mode is allowed to exist at all.
 *
 * Every knob here is operator-supplied. With none of them set the module reports
 * itself unavailable and /bootstrap answers 503 instead of half-provisioning.
 */

import crypto from "crypto";
import axios from "axios";
import IORedis from "ioredis";
import {
  ATLAS_PUBLIC_KEY,
  ATLAS_PRIVATE_KEY,
  ATLAS_GROUP_ID,
  ATLAS_CLUSTER_NAME,
  ATLAS_CLUSTER_HOST,
  MANAGED_REDIS_ADMIN_URL,
  MANAGED_REDIS_PUBLIC_HOST,
  MANAGED_STORAGE_SECRET,
} from "../config/env.js";

const ATLAS_BASE = "https://cloud.mongodb.com/api/atlas/v2";
const ATLAS_ACCEPT = "application/vnd.atlas.2023-01-01+json";
const TIMEOUT_MS = 20000;
export const LEASE_HOURS = 12;

export function provisioningReady() {
  return Boolean(
    ATLAS_PUBLIC_KEY && ATLAS_PRIVATE_KEY && ATLAS_GROUP_ID && ATLAS_CLUSTER_HOST &&
    MANAGED_REDIS_ADMIN_URL && MANAGED_REDIS_PUBLIC_HOST && MANAGED_STORAGE_SECRET,
  );
}

// ── Identity ─────────────────────────────────────────────────────────────────
// One license is one instance is one tenant, so the license id is the tenant id:
// it exists before the container boots and dies when the license is revoked.
export const tenant = (id) => ({
  db: `bb_${id}`,
  mongoUser: `bb_${id}`,
  redisUser: `t_${id}`,
  prefix: `bb:${id}:`,
});

// Derived, never stored. A refresh must hand back the *same* credential — the
// instance's connection pools were opened on it — so recomputing beats keeping a
// password at rest. Bumping `version` is how a rotation happens.
export function derivePassword(id, version = 1) {
  return crypto
    .createHmac("sha256", MANAGED_STORAGE_SECRET)
    .update(`${id}:v${version}`)
    .digest("base64url")
    .slice(0, 32);
}

// ── Atlas Admin API (HTTP digest) ────────────────────────────────────────────

// Hand-rolled because axios has no digest support and Atlas' programmatic API
// keys speak nothing else. `user`/`pass`/`cnonce` are injectable so the response
// can be checked against RFC 2617's published vector — an auth routine that has
// never been verified against a known answer is a guess.
export function digestHeader(challenge, method, uri, opts = {}) {
  const {
    user = ATLAS_PUBLIC_KEY,
    pass = ATLAS_PRIVATE_KEY,
    cnonce = crypto.randomBytes(8).toString("hex"),
    nc = "00000001",
  } = opts;
  const p = Object.fromEntries(
    [...challenge.matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]+))/g)].map((m) => [m[1], m[2] ?? m[3]]),
  );
  const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
  const ha1 = md5(`${user}:${p.realm}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = p.qop
    ? md5(`${ha1}:${p.nonce}:${nc}:${cnonce}:auth:${ha2}`)
    : md5(`${ha1}:${p.nonce}:${ha2}`);

  const parts = [
    `username="${user}"`,
    `realm="${p.realm}"`,
    `nonce="${p.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];
  if (p.opaque) parts.push(`opaque="${p.opaque}"`);
  if (p.qop) parts.push(`qop=auth`, `nc=${nc}`, `cnonce="${cnonce}"`);
  if (p.algorithm) parts.push(`algorithm=${p.algorithm}`);
  return `Digest ${parts.join(", ")}`;
}

async function atlas(method, path, body) {
  const uri = `/api/atlas/v2${path}`;
  const opts = {
    method,
    url: `${ATLAS_BASE}${path}`,
    data: body,
    timeout: TIMEOUT_MS,
    headers: { Accept: ATLAS_ACCEPT, "Content-Type": ATLAS_ACCEPT },
    validateStatus: (s) => s === 401 || (s >= 200 && s < 300) || s === 409 || s === 404,
  };

  const first = await axios(opts);
  if (first.status !== 401) return first;

  const challenge = first.headers["www-authenticate"];
  if (!challenge) throw new Error("Atlas refused the API key");

  const second = await axios({
    ...opts,
    headers: { ...opts.headers, Authorization: digestHeader(challenge, method, uri) },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 409 || s === 404,
  });
  return second;
}

async function upsertAtlasUser(id, pass, expiresAt) {
  const t = tenant(id);
  const body = {
    groupId: ATLAS_GROUP_ID,
    databaseName: "admin",
    username: t.mongoUser,
    password: pass,
    roles: [{ databaseName: t.db, roleName: "readWrite" }],
    // Atlas expires the user on its own, so an instance that simply disappears
    // stops being able to reach the cluster without anyone running a cleanup.
    deleteAfterDate: new Date(expiresAt).toISOString(),
    ...(ATLAS_CLUSTER_NAME ? { scopes: [{ name: ATLAS_CLUSTER_NAME, type: "CLUSTER" }] } : {}),
  };

  const created = await atlas("POST", `/groups/${ATLAS_GROUP_ID}/databaseUsers`, body);
  if (created.status === 409) {
    // Already exists — this is a lease renewal, so push the expiry out and
    // reassert the password rather than minting a second identity.
    const patched = await atlas(
      "PATCH",
      `/groups/${ATLAS_GROUP_ID}/databaseUsers/admin/${t.mongoUser}`,
      body,
    );
    if (patched.status >= 400) throw new Error(`Atlas user renewal failed (${patched.status})`);
    return;
  }
  if (created.status >= 400) throw new Error(`Atlas user creation failed (${created.status})`);
}

async function deleteAtlasUser(id) {
  const t = tenant(id);
  await atlas("DELETE", `/groups/${ATLAS_GROUP_ID}/databaseUsers/admin/${t.mongoUser}`);
}

// ── Redis ACL ────────────────────────────────────────────────────────────────

async function withAdminRedis(fn) {
  const client = new IORedis(MANAGED_REDIS_ADMIN_URL, {
    maxRetriesPerRequest: 1,
    commandTimeout: TIMEOUT_MS,
    lazyConnect: true,
  });
  try {
    await client.connect();
    return await fn(client);
  } finally {
    client.disconnect();
  }
}

async function upsertRedisUser(id, pass) {
  const t = tenant(id);
  await withAdminRedis((client) =>
    client.call(
      "ACL", "SETUSER", t.redisUser,
      "reset",
      "on", `>${pass}`,
      // Keys and pub/sub channels alike: without the &-pattern a tenant could
      // subscribe to another tenant's channels even though its keys are fenced.
      `~${t.prefix}*`, `&${t.prefix}*`,
      "+@all", "-@dangerous", "-@admin",
    ),
  );
}

async function deleteRedisUser(id) {
  const t = tenant(id);
  await withAdminRedis((client) => client.call("ACL", "DELUSER", t.redisUser));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Mint (or renew) one tenant's storage credentials. Idempotent: called again
 * before expiry it returns the identical URIs with a later expiry, which is what
 * lets a running instance extend its lease without reconnecting.
 */
export async function provisionTenant(id, { version = 1 } = {}) {
  if (!provisioningReady()) throw new Error("managed storage provisioning is not configured");

  const t = tenant(id);
  const pass = derivePassword(id, version);
  const expiresAt = new Date(Date.now() + LEASE_HOURS * 3600_000);

  await upsertAtlasUser(id, pass, expiresAt);
  await upsertRedisUser(id, pass);

  const enc = encodeURIComponent;
  return {
    mongoUri: `mongodb+srv://${enc(t.mongoUser)}:${enc(pass)}@${ATLAS_CLUSTER_HOST}/${t.db}?retryWrites=true&w=majority`,
    redisUrl: `redis://${enc(t.redisUser)}:${enc(pass)}@${MANAGED_REDIS_PUBLIC_HOST}`,
    redisPrefix: t.prefix,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Revoke a tenant's access. The data itself is left in place — a customer who
 * cancels and comes back should not discover we deleted their workflows — but
 * nothing can reach it until a new lease is minted.
 */
export async function deprovisionTenant(id) {
  if (!provisioningReady()) return;
  await Promise.allSettled([deleteAtlasUser(id), deleteRedisUser(id)]);
}

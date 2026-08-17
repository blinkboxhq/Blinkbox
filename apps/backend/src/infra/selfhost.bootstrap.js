/**
 * Managed-storage bootstrap (self-hosted, SELF_HOST_STORAGE=managed).
 *
 * The customer's box gets a Mongo database and a Redis ACL user that belong to
 * it alone, minted by the cloud at boot and handed over with a 12h lease. They
 * are never written to disk and never appear in .env: if this box is stolen,
 * what leaks is one tenant's credentials with hours left on them.
 *
 * This module deliberately does NOT import config/env.js. An ES module body runs
 * once, so config/env.js freezes process.env into consts the moment anything
 * imports it — importing it here would capture the pre-bootstrap MONGODB_URI and
 * REDIS_URL, which in managed mode point at a Mongo that was never started.
 * Everything below reads process.env directly, and index.js awaits this before
 * it imports anything else.
 */

import axios from "axios";

const REFRESH_AT = 0.8;          // of the lease, per manifest §4.3
const BOOT_ATTEMPTS = 5;
const TIMEOUT_MS = 15000;

let lease = null;                // { mongoUri, redisUrl, redisPrefix, expiresAt }
let timer = null;

const managed = () =>
  process.env.SELF_HOSTED === "true" && process.env.SELF_HOST_STORAGE === "managed";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mint() {
  const base = (process.env.CLOUD_API_URL || "https://api.blinkbox.net").replace(/\/$/, "");
  const { data } = await axios.post(
    `${base}/api/self-host/bootstrap`,
    {},
    {
      timeout: TIMEOUT_MS,
      headers: { Authorization: `Bearer ${process.env.SELF_HOST_LICENSE_KEY}` },
    },
  );

  for (const field of ["mongoUri", "redisUrl", "redisPrefix", "expiresAt"]) {
    if (!data?.[field]) throw new Error(`/bootstrap returned no ${field}`);
  }
  const expiresAt = Date.parse(data.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error("/bootstrap returned an unparseable expiresAt");

  return { ...data, expiresAt };
}

function apply(next) {
  process.env.MONGODB_URI = next.mongoUri;
  process.env.REDIS_URL = next.redisUrl;
  process.env.REDIS_KEY_PREFIX = next.redisPrefix;
  lease = next;
}

// A lease refresh extends the life of the *same* credentials — the cloud renews
// the Atlas user and the Redis ACL user rather than minting new ones, precisely
// so the pools opened at boot stay valid. If it ever hands back a different
// credential the live mongoose and ioredis pools cannot be re-pointed in place,
// so the honest move is to exit and let the container come back on the new one.
function rotated(next) {
  return next.mongoUri !== lease.mongoUri || next.redisUrl !== lease.redisUrl;
}

function schedule() {
  const lifetime = lease.expiresAt - Date.now();
  const delay = Math.max(60_000, Math.floor(lifetime * REFRESH_AT));
  clearTimeout(timer);
  timer = setTimeout(refresh, delay);
  timer.unref?.();
}

async function refresh() {
  try {
    const next = await mint();
    if (rotated(next)) {
      console.error("[Bootstrap] cloud rotated storage credentials — restarting to pick them up");
      return process.exit(1);
    }
    apply(next);
    console.log(`[Bootstrap] lease extended to ${new Date(lease.expiresAt).toISOString()}`);
    schedule();
  } catch (err) {
    const left = lease.expiresAt - Date.now();
    if (left <= 0) {
      // Past expiry the cloud has already dropped the Atlas user and the Redis
      // ACL user, so the open connections are dead regardless. Exiting turns a
      // stream of auth errors into one restart that retries the whole bootstrap.
      console.error("[Bootstrap] storage lease expired and the cloud is unreachable — stopping");
      return process.exit(1);
    }
    const retry = Math.min(left, 5 * 60_000);
    console.warn(
      `[Bootstrap] lease refresh failed (${err.message}) — retrying in ${Math.round(retry / 1000)}s, ` +
        `lease good until ${new Date(lease.expiresAt).toISOString()}`,
    );
    clearTimeout(timer);
    timer = setTimeout(refresh, retry);
    timer.unref?.();
  }
}

/**
 * Fetch this instance's storage credentials and put them in process.env before
 * anything reads them. No-op on cloud and in local mode. Throws if managed mode
 * cannot be satisfied — booting on a half-configured data plane is worse than
 * not booting.
 */
export async function primeManagedStorage() {
  if (!managed()) return false;

  if (!process.env.SELF_HOST_LICENSE_KEY) {
    throw new Error("SELF_HOST_STORAGE=managed requires SELF_HOST_LICENSE_KEY");
  }

  let last;
  for (let attempt = 1; attempt <= BOOT_ATTEMPTS; attempt++) {
    try {
      apply(await mint());
      console.log(
        `[Bootstrap] managed storage leased until ${new Date(lease.expiresAt).toISOString()}`,
      );
      schedule();
      return true;
    } catch (err) {
      last = err;
      const status = err.response?.status;
      // A refused license is an answer, not an outage: retrying cannot change it.
      if (status === 401 || status === 403) {
        throw new Error(`license rejected by /bootstrap (${status})`);
      }
      if (attempt < BOOT_ATTEMPTS) {
        const wait = attempt * 3000;
        console.warn(`[Bootstrap] attempt ${attempt} failed (${err.message}) — retrying in ${wait / 1000}s`);
        await sleep(wait);
      }
    }
  }
  throw new Error(`could not lease managed storage: ${last.message}`);
}

export function leaseExpiresAt() {
  return lease ? new Date(lease.expiresAt).toISOString() : null;
}

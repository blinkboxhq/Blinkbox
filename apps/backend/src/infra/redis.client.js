import Redis from "ioredis";
import { REDIS_URL, REDIS_KEY_PREFIX } from "../config/env.js";

// commandTimeout: without it ioredis parks every command in an unbounded
// offline queue while disconnected, so an await on redis.get() never settles
// and the caller hangs forever instead of failing.
// lazyConnect: 91 modules import this file, so connecting on import meant any
// process that merely loaded one of them — a unit test, a one-off script —
// opened a socket that retried forever and kept the event loop alive. The
// connection now opens on first command instead.
// (BullMQ's blocking commands use their own connection — see infra/bullmq.js.)
// keyPrefix: empty on cloud and in local self-host. In managed mode it is the
// tenant namespace the Redis ACL user is locked to, so it is not a nicety —
// without it the first command is refused. Note ioredis prefixes the keys it
// sends but returns them unchanged, so KEYS/SCAN results come back *with* the
// prefix attached — see stripPrefix() below.
const redis = new Redis(REDIS_URL || "redis://127.0.0.1:6379", {
  keyPrefix: REDIS_KEY_PREFIX,
  retryStrategy: (times) => Math.min(times * 200, 10000),
  maxRetriesPerRequest: 2,
  commandTimeout: 5000,
  lazyConnect: true,
});

// ioredis retries forever, and an unreachable Redis emits one error per
// attempt — left unthrottled that buries every other log under thousands of
// identical stacks. Log the first failure, then one rollup per minute.
const ERROR_ROLLUP_MS = 60000;
let suppressed = 0;
let lastLoggedAt = 0;
let lastCode = null;

redis.on("connect", () => {
  if (suppressed > 0) {
    console.log(`✅ Redis connected (${suppressed} connection errors suppressed)`);
  } else {
    console.log("✅ Redis connected");
  }
  suppressed = 0;
  lastLoggedAt = 0;
  lastCode = null;
});

redis.on("error", (err) => {
  const code = err?.code || err?.message || "unknown";
  const now = Date.now();
  if (code !== lastCode || now - lastLoggedAt >= ERROR_ROLLUP_MS) {
    const repeats = suppressed > 0 ? ` (${suppressed} more since last log)` : "";
    console.error(`❌ Redis ${code} — retrying${repeats}`);
    lastCode = code;
    lastLoggedAt = now;
    suppressed = 0;
  } else {
    suppressed++;
  }
});

// Feeding a KEYS/SCAN result straight back into del()/get() double-prefixes it
// and quietly matches nothing. Every caller that pattern-matches keys must run
// the results through this first.
export function stripPrefix(keys) {
  if (!REDIS_KEY_PREFIX) return keys;
  return keys.map((k) => (k.startsWith(REDIS_KEY_PREFIX) ? k.slice(REDIS_KEY_PREFIX.length) : k));
}

export { redis }; // named export

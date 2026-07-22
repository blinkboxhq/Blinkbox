import Redis from "ioredis";
import { REDIS_URL } from "../config/env.js";

const redis = new Redis(REDIS_URL || "redis://127.0.0.1:6379", {
  retryStrategy: (times) => Math.min(times * 200, 10000),
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

export { redis }; // named export

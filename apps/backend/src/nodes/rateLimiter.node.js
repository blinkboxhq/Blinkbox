/**
 * RATE LIMITER NODE — throttle execution using Redis counters.
 * Blocks or drops executions that exceed the configured limit per window.
 */
import { redis } from "../infra/redis.client.js";

const WINDOW_SECONDS = { second: 1, minute: 60, hour: 3600 };

export default {
  async run(config, input, context = {}) {
    const limit = config.limit ?? 10;
    const window = config.window ?? "minute";
    const strategy = config.strategy ?? "error";

    const windowSec = WINDOW_SECONDS[window] ?? 60;
    // Scope by node, not execution: a counter keyed on executionId resets every
    // run, so it could never limit the thing it exists to limit — traffic across
    // runs. One limiter node = one shared budget for its workspace.
    const key = `rate_limit:${context.workspaceId}:${context.nodeId ?? "global"}:${window}`;

    let count = 0;
    try {
      count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
    } catch {
      // If Redis is unavailable, pass through
      return { ...input, __rateLimited: false, count: 0 };
    }

    if (count > limit) {
      if (strategy === "error") {
        throw new Error(`Rate limit exceeded: ${count}/${limit} requests per ${window}. Add a Delay node or increase the limit.`);
      }
      if (strategy === "drop") {
        return { ...input, __stopBranch: true, rateLimited: true, dropped: true, count };
      }
      // strategy === 'queue' — just pass through, upstream handles queuing
    }

    return { ...input, __rateLimited: false, count };
  },
};

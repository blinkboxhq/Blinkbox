/**
 * REDIS NODE — slim entry. Resolves (and pools) the Redis connection-URL
 * credential, then delegates to the modular router under _packaged/redis/.
 * Preserves the original node's contract EXACTLY: an absent credential SKIPS, a
 * failed credential resolution SKIPS, an unknown operation THROWS (single-quoted,
 * verbatim), and per-op validation returns skip objects. Handlers receive
 * (config, redis).
 */
import { run as runRedis, DEFAULT_OPERATION } from "../_packaged/redis/router.js";
import { getClient } from "../_packaged/redis/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "Redis: No credential selected — pick a Redis connection URL credential.", skipped: true };
    }

    let redis;
    try {
      redis = await getClient(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Redis: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runRedis({ ...config, operation }, redis);
  },
};

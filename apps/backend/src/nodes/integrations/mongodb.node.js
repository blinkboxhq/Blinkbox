/**
 * MONGODB NODE — slim entry. Resolves (and pools) the MongoDB connection-string
 * credential, then delegates to the modular router under _packaged/mongodb/.
 * Preserves the original node's contract EXACTLY, including ordering: a missing
 * 'collection' SKIPS first, then an absent credential SKIPS, then a failed
 * credential resolution SKIPS, an unknown operation THROWS (single-quoted,
 * verbatim), and per-op JSON validation throws via handleError. Handlers receive
 * (config, ctx).
 */
import { run as runMongo, DEFAULT_OPERATION } from "../_packaged/mongodb/router.js";
import { getDb } from "../_packaged/mongodb/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    const { database, collection } = config;

    if (!collection) return { success: false, error: "MongoDB: 'collection' is required.", skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "MongoDB: No credential selected — pick a MongoDB connection string credential.", skipped: true };
    }

    let conn;
    try {
      conn = await getDb(config.credentialId, context.workspaceId, database);
    } catch (e) {
      return { success: false, error: `MongoDB: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runMongo({ ...config, operation }, conn);
  },
};

/**
 * POSTGRES NODE — slim entry. Opens a pg Client from the connection-string
 * credential, then delegates op dispatch to the modular router under
 * _packaged/postgres/. Preserves the original node's contract EXACTLY: an absent
 * credential SKIPS, but a FAILED connect propagates through handleError (it does
 * NOT skip — the connect lives inside the try), unknown operations fall through
 * to the plain row query (no throw), per-op validation SKIPS, and the client is
 * always closed in `finally`. Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/postgres/GenericFunctions.js";
import { run as runPostgres, DEFAULT_OPERATION } from "../_packaged/postgres/router.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "PostgreSQL: No credential selected — pick a PostgreSQL connection string credential.", skipped: true };
    }

    let client;
    try {
      client = await getClient(config.credentialId, context.workspaceId);
      return await runPostgres({ ...config, operation }, client);
    } catch (err) {
      handleError(err);
    } finally {
      client?.end().catch(() => {});
    }
  },
};

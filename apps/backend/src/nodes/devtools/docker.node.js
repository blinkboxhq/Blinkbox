/**
 * DOCKER NODE — slim entry. Builds a Docker Engine API client over the local Unix
 * socket, then delegates op dispatch to the modular router under _packaged/docker/.
 * Preserves the monolith's contract EXACTLY: no credential (socket-governed),
 * unknown operations THROW double-quoted, per-op validation SKIPS on missing IDs.
 * Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/docker/GenericFunctions.js";
import { run as runDocker, DEFAULT_OPERATION } from "../_packaged/docker/router.js";

export default {
  async run(config) {
    const operation = config.operation || DEFAULT_OPERATION;
    try {
      const client = getClient();
      return await runDocker({ ...config, operation }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};

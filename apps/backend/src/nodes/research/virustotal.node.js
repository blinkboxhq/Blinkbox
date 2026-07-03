/**
 * VIRUSTOTAL NODE — slim entry. Resolves the API key into an x-apikey client, then
 * delegates op dispatch to the modular router under _packaged/virustotal/.
 * Preserves the monolith's contract EXACTLY: a missing API key THROWS
 * ("virustotal: API key is required."), a 404 is a soft miss ({ found: false }),
 * unknown operations THROW double-quoted, per-op validation SKIPS. Folds
 * input?.url / input?.hash / input?.ip / input?.domain into config to keep the
 * monolith's input-fallback behavior. Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/virustotal/GenericFunctions.js";
import { run as runVirustotal, DEFAULT_OPERATION } from "../_packaged/virustotal/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const merged = {
      ...config,
      operation,
      url: config.url || input?.url,
      hash: config.hash || input?.hash,
      ip: config.ip || input?.ip,
      domain: config.domain || input?.domain,
    };
    try {
      const client = getClient(config, { ...context, input });
      return await runVirustotal(merged, client);
    } catch (err) {
      return handleError(err);
    }
  },
};

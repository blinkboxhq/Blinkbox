/**
 * AZURE DEVOPS NODE — slim entry. Resolves the PAT into a Basic-auth client, then
 * delegates op dispatch to the modular router under _packaged/azureDevops/.
 * Preserves the monolith's contract EXACTLY: a missing token THROWS
 * ("azure_devops: … required."), a missing `organization` SKIPS (after the token
 * check), unknown operations THROW double-quoted, per-op validation SKIPS.
 * Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/azureDevops/GenericFunctions.js";
import { run as runAzure, DEFAULT_OPERATION } from "../_packaged/azureDevops/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const org = config.organization || input?.organization;
    try {
      const client = await getClient(config, { ...context, input });
      if (!org) return { success: false, error: "azure_devops: 'organization' is required.", skipped: true };
      return await runAzure({ ...config, operation }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};

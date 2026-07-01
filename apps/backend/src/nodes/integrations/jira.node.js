/**
 * JIRA NODE — slim entry. Resolves the Basic-auth credential (base64), enforces
 * the domain + credential gates, builds the requester ctx, then delegates to the
 * modular router in _packaged/jira/. 34 operations.
 *
 * Auth: Basic auth — base64("email:apiToken") stored in vault,
 *       or store as "email:apiToken" and this node encodes it.
 */
import { run as runJira, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/jira/router.js";
import { getAuth, makeReq } from "../_packaged/jira/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const { operation = DEFAULT_OPERATION, domain } = config;

    if (!OPERATIONS[operation]) return { success: false, error: `Jira: Unknown operation "${operation}".`, skipped: true };

    if (!domain) return { success: false, error: "Jira: 'domain' is required (e.g. mycompany.atlassian.net).", skipped: true };
    if (!config.credentialId) return { success: false, error: "Jira: No credential selected — pick a Jira API token credential.", skipped: true };

    let base64Auth;
    try {
      base64Auth = await getAuth(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Jira: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runJira(config, makeReq(base64Auth, config));
  },
};

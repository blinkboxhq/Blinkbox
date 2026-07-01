import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runDatadog, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/datadog/router.js";
import { makeRequester } from "../_packaged/datadog/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Datadog: Unknown operation "${op}".`, skipped: true };
    if (!config.credentialId) {
      return { success: false, error: "Datadog: No credential selected — pick a Datadog credential.", skipped: true };
    }

    const site = config.site || "datadoghq.com";

    let apiKey, appKey;
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Datadog");
      try {
        const j = JSON.parse(raw);
        apiKey = j.apiKey;
        appKey = j.appKey;
      } catch {
        apiKey = raw;
      }
    } catch (e) {
      return { success: false, error: `Datadog: Could not resolve credential — ${e.message}`, skipped: true };
    }
    if (!apiKey) return { success: false, error: "Datadog: API key required.", skipped: true };

    return runDatadog(config, makeRequester({ apiKey, appKey, site }));
  },
};

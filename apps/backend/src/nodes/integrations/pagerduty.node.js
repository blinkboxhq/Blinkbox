/**
 * PAGERDUTY NODE — slim entry. Resolves the API token for REST ops, then
 * delegates to the modular router in _packaged/pagerduty/. Events API ops
 * (trigger/resolve/acknowledge) need no auth — the router calls them with just
 * config. 37 operations.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runPagerDuty, OPERATIONS, DEFAULT_OPERATION, EVENT_OPS } from "../_packaged/pagerduty/router.js";
import { makeReq } from "../_packaged/pagerduty/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `PagerDuty: Unknown operation "${op}".`, skipped: true };

    if (EVENT_OPS.has(op)) return runPagerDuty(config, null);

    if (!config.credentialId)
      return { success: false, error: "PagerDuty: No credential selected — pick a PagerDuty credential.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "PagerDuty");
    } catch (e) {
      return { success: false, error: `PagerDuty: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runPagerDuty(config, makeReq(token));
  },
};

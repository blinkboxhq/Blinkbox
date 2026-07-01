import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runStripe, OPERATIONS, DEFAULT_OPERATION } from "../../../../../packages/nodes/stripe/backend/router.js";
import { makeReq } from "../../../../../packages/nodes/stripe/backend/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Stripe: Unknown operation "${op}".`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Stripe: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Stripe");
    } catch (e) {
      return { success: false, error: `Stripe: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runStripe(config, makeReq(apiKey));
  },
};

/**
 * SHOPIFY NODE — slim entry. Resolves the Admin API access token from the
 * vault, builds the store's axios instance, and delegates to the modular
 * router in packages/nodes/shopify/backend/. Auth stays here; ops live there.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runShopify, OPERATIONS, DEFAULT_OPERATION } from "../../../../../packages/nodes/shopify/backend/router.js";
import { makeApi } from "../../../../../packages/nodes/shopify/backend/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Shopify: Unknown operation "${op}".`, skipped: true };

    if (!config.shop) return { success: false, error: "Shopify: 'shop' (e.g. mystore.myshopify.com) is required.", skipped: true };
    if (!config.credentialId) return { success: false, error: "Shopify: No credential selected.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Shopify");
    } catch (e) {
      return { success: false, error: `Shopify: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runShopify(config, { api: makeApi(config.shop, token) });
  },
};

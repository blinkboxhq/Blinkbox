/**
 * WOOCOMMERCE NODE — slim entry. Resolves the consumer key/secret credential,
 * builds an axios client bound to the store's /wp-json/wc/v3 base, then
 * delegates to the modular router under _packaged/woocommerce/. Handlers receive
 * (config, api). Preserves the original node's contract: skip on
 * missing-credential / missing storeUrl / missing consumerKey / per-op
 * validation, but THROW on unknown operation (the monolith's switch default
 * threw), with the original message text.
 */
import { run as runWoo, DEFAULT_OPERATION } from "../_packaged/woocommerce/router.js";
import { getCreds, makeClient } from "../_packaged/woocommerce/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "WooCommerce: credential required.", skipped: true };
    }
    if (!config.storeUrl) {
      return { success: false, error: "WooCommerce: storeUrl required.", skipped: true };
    }

    const { consumerKey, consumerSecret } = await getCreds(config.credentialId, context.workspaceId);
    if (!consumerKey) return { success: false, error: "WooCommerce: consumerKey missing in credential.", skipped: true };

    const api = makeClient(config.storeUrl, consumerKey, consumerSecret);
    return runWoo({ ...config, operation, input }, api);
  },
};

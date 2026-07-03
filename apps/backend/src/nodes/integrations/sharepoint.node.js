/**
 * SHAREPOINT NODE — slim entry. Resolves the Microsoft OAuth token from the
 * credential store, then delegates to the modular router under
 * _packaged/sharepoint/. Preserves the original node's contract EXACTLY: the
 * token is only resolved when a credentialId is present, an absent token SKIPS,
 * an unknown operation returns a skip object (SKIP-family — no throw), and per-op
 * validation returns skip objects. Handlers receive (config, ctx) where ctx is
 * { headers, siteId, input }.
 */
import { run as runSharePoint, DEFAULT_OPERATION } from "../_packaged/sharepoint/router.js";
import { getToken, graphHeaders } from "../_packaged/sharepoint/GenericFunctions.js";

export default {
  async run(config, input = {}, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    const siteId = config.siteId || input.siteId || "";

    const token = await getToken(config.credentialId, context.workspaceId);
    if (!token) return { success: false, error: "SharePoint: Microsoft OAuth token required.", skipped: true };

    const ctx = { headers: graphHeaders(token), siteId, input };
    return runSharePoint({ ...config, operation }, ctx);
  },
};

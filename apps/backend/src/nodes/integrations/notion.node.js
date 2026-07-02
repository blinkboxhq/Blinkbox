/**
 * NOTION NODE — slim entry.
 * Resolves the Notion Integration Token credential, then delegates to the
 * modular router in _packaged/notion/ (pages, databases, blocks, search,
 * users, comments — 19 operations).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runNotion, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/notion/router.js";
import { makeReq } from "../_packaged/notion/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[op])
      return { success: false, error: `Notion: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId) {
      return { success: false, error: "Notion: No credential selected — pick a Notion Integration Token credential.", skipped: true };
    }
    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Notion");
    } catch (e) {
      return { success: false, error: `Notion: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runNotion(config, makeReq(token));
  },
};

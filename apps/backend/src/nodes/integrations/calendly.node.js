/**
 * CALENDLY NODE — entry point.
 * Owns credentials/auth only. All 33 action handlers live in the co-located
 * package: _packaged/calendly/ (router.js + v1/*Description.js).
 * Auth: Bearer personal access token / OAuth token. Base https://api.calendly.com
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runCalendly, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/calendly/router.js";
import { BASE_URL } from "../_packaged/calendly/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Calendly: Unknown operation "${op}".`, skipped: true };
    if (!config.credentialId) return { success: false, error: "Calendly: No credential selected.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Calendly");
    } catch (e) {
      return { success: false, error: `Calendly: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });

    return runCalendly(config, { api });
  },
};

/**
 * GOOGLE CALENDAR NODE — slim entry.
 * Resolves the Google OAuth2 credential, then delegates to the modular router
 * in _packaged/googleCalendar/ (events, calendars, ACL, free/busy — 23 operations).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runGoogleCalendar, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/googleCalendar/router.js";
import { makeReq } from "../_packaged/googleCalendar/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) return { success: false, error: "Google Calendar: No credential selected.", skipped: true };

    if (!OPERATIONS[op]) return { success: false, error: `Google Calendar: Unknown operation "${op}".`, skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Google Calendar");
    } catch (e) {
      return { success: false, error: `Google Calendar: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runGoogleCalendar(config, makeReq(token), context);
  },
};

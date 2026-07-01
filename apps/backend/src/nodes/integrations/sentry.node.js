/**
 * SENTRY NODE — slim entry. Resolves the API auth token, builds the requester
 * (ctx = { org, headers }), then delegates to the modular router in
 * _packaged/sentry/. 31 operations across issues, projects, releases, teams,
 * organizations and monitoring.
 *
 * Auth: Sentry API auth token (Bearer). captureEvent uses the project DSN.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runSentry, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/sentry/router.js";
import { makeReq, skip } from "../_packaged/sentry/GenericFunctions.js";

export default {
  async run(config, input = {}, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    const org = config.organization || config.org || input.organization || "";

    if (!OPERATIONS[operation]) return skip(operation, "unknown operation");
    if (!config.credentialId) return { success: false, error: "Sentry: auth token required.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Sentry");
    } catch (err) {
      return { success: false, error: `Sentry: Failed to resolve credential — ${err.message}`, skipped: true };
    }
    if (!token) return { success: false, error: "Sentry: auth token required.", skipped: true };

    return runSentry(config, makeReq(token, { organization: org }));
  },
};

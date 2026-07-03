/**
 * TWILIO NODE — slim entry.
 * Resolves the "AccountSID:AuthToken" credential, then delegates to the
 * modular router in _packaged/twilio/ (messages, calls, verify, numbers —
 * 14 operations).
 */
import { run as runTwilio, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/twilio/router.js";
import { getCreds, makeReq } from "../_packaged/twilio/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation])
      return { success: false, error: `Twilio: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId)
      return { success: false, error: "Twilio: No credential configured — add your Twilio Account SID:AuthToken to the Vault.", skipped: true };

    let creds;
    try {
      creds = await getCreds(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Twilio: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runTwilio(config, makeReq(creds));
  },
};

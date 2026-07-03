/**
 * FIREBASE NODE (Admin SDK) — slim entry. Resolves the service-account JSON
 * credential, lazily initialises (and caches) a firebase-admin app exposing
 * { db, auth, messaging }, then delegates to the modular router under
 * _packaged/firebase/. Handlers receive (config, { db, auth, messaging }).
 * Preserves the original node's contract: skip on missing-credential /
 * cred-resolution failure / per-op validation, but THROW on unknown operation
 * (the monolith's switch default threw), with the original message text.
 */
import { run as runFirebase, DEFAULT_OPERATION } from "../_packaged/firebase/router.js";
import { getFirebase } from "../_packaged/firebase/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "Firebase: No credential selected — pick a Firebase service account credential.", skipped: true };
    }

    let fb;
    try {
      fb = await getFirebase(config.credentialId, context.workspaceId);
    } catch (err) {
      return { success: false, error: `Firebase: Could not resolve credential — ${err.message}`, skipped: true };
    }

    return runFirebase({ ...config, operation, input }, fb);
  },
};
